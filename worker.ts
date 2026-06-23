import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Worker } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from './app/lib/github';
import { generateQuestionsForFile, generateFinalQuestionsJson } from './app/lib/gemini';
import { smartTruncate, getFilePriority } from './app/lib/utils';
import { analyzeCodeAST } from './app/lib/astAnalyzer';
import { analyzePythonCode } from './app/lib/pythonAstParser';
import { analyzeCodeAST as analyzeCppAST } from './app/lib/astAnalyzerCpp';

const REDIS_URL = process.env.REDIS_URL!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

function buildSnippet(code: string, lineNumber: number): string {
  const lines = code.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return '';
  const start = Math.max(0, idx - 5);
  const end = Math.min(lines.length, idx + 6);
  const out: string[] = [];
  for (let i = start; i < end; i++) {
    const marker = i === idx ? '→ ►' : '  ';
    out.push(`${marker} ${i + 1}: ${lines[i]}`);
  }
  return out.join('\n');
}

async function collectCodeFiles(owner: string, repo: string) {
  const root = await fetchRepoContents(owner, repo, '');
  const collected: any[] = [];
  const skipDirs = new Set(['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static']);
  for (const item of root) {
    if (item.type === 'file' && isCodeFile(item.name)) {
      collected.push(item);
    } else if (item.type === 'dir' && !skipDirs.has(item.name)) {
      try {
        const sub = await fetchRepoContents(owner, repo, item.path);
        for (const s of sub) {
          if (s.type === 'file' && isCodeFile(s.name)) collected.push(s);
        }
      } catch { /* ignore */ }
    }
  }
  return collected;
}

async function analyzeRepo(repoUrl: string, jobId: string) {
  const { owner, repo } = extractRepoInfo(repoUrl);
  const readme = await getReadme(owner, repo);
  const allFiles = await collectCodeFiles(owner, repo);
  if (allFiles.length === 0) throw new Error('No supported code files found');

  // Supported extensions: JS/TS, Python, C/C++
  const supportedFiles = allFiles.filter(f => /\.(js|jsx|ts|tsx|py|c|cpp|cc|cxx)$/i.test(f.path));
  if (supportedFiles.length === 0) {
    throw new Error('No JavaScript/TypeScript, Python, or C/C++ files found');
  }

  const sorted = supportedFiles
    .map((f) => ({ ...f, priority: getFilePriority(f.path) }))
    .sort((a, b) => a.priority - b.priority || a.path.length - b.path.length);
  const topFiles = sorted.slice(0, 3);
  const fileResults: Array<{ fileName: string; questions: string; codeSnapshots: Array<{ lineNumber: number; snippet: string }> }> = [];
  let totalQuestions = 0;
  const warnings: string[] = [];

  for (const file of topFiles) {
    if (!file.download_url) continue;
    const content = await fetchFileContent(file.download_url);
    if (!content || content.trim().length === 0) continue;
    const { truncatedCode } = smartTruncate(content);

    let astAnalysis = null;
    const isJS = /\.(js|jsx|ts|tsx)$/i.test(file.path);
    const isPython = /\.py$/i.test(file.path);
    const isCpp = /\.(c|cpp|cc|cxx)$/i.test(file.path);

    if (isJS) {
      try {
        astAnalysis = analyzeCodeAST(truncatedCode, file.path);
      } catch (err) {
        console.warn(`JS/TS AST failed for ${file.path}:`, err);
      }
    } else if (isPython) {
      try {
        astAnalysis = await analyzePythonCode(truncatedCode);
      } catch (err) {
        console.warn(`Python AST failed for ${file.path}:`, err);
      }
    } else if (isCpp) {
      try {
        astAnalysis = await analyzeCppAST(truncatedCode);
      } catch (err) {
        console.warn(`C++ AST failed for ${file.path}:`, err);
      }
    }

    let questionsArray: any[] = [];
    try {
      questionsArray = await generateQuestionsForFile(
        truncatedCode,
        file.path,
        readme || undefined,
        repo,
        astAnalysis
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      warnings.push(`Failed to generate questions for ${file.path}: ${msg}`);
      continue;
    }

    const codeSnapshots: Array<{ lineNumber: number; snippet: string }> = [];
    for (const q of questionsArray) {
      if (q.lineStart && !codeSnapshots.some(s => s.lineNumber === q.lineStart)) {
        const snippet = buildSnippet(content, q.lineStart);
        if (snippet) codeSnapshots.push({ lineNumber: q.lineStart, snippet });
      }
    }

    let questionsText = '';
    let cCounter = 1, pCounter = 1;
    for (const q of questionsArray) {
      const tag = q.category === 'C' ? `C${cCounter++}` : `P${pCounter++}`;
      const lineRef = q.lineStart ? ` Line ${q.lineStart}:` : '';
      const cleanText = q.text.replace(/^\[[^\]]+\]\s*/, '');
      questionsText += `[${tag}]${lineRef} ${cleanText}\nA: ${q.answer}\n\n`;
    }
    totalQuestions += questionsArray.length;
    fileResults.push({ fileName: file.path, questions: questionsText, codeSnapshots });
  }

  if (fileResults.length === 0) {
    throw new Error(warnings.length ? warnings.join('; ') : 'Failed to generate questions for any file');
  }

  let readmeQuestions = '', genericQuestions = '';
  if (readme) {
    const finalArray = await generateFinalQuestionsJson(readme, repo);
    const readmeQs = finalArray.filter(q => q.text?.startsWith('[D]'));
    const genericQs = finalArray.filter(q => q.text?.startsWith('[G1]') || q.text?.startsWith('[G2]'));
    if (readmeQs.length) {
      const clean = readmeQs[0].text.replace(/^\[D\]\s*/, '');
      readmeQuestions = `[D] ${clean}\nA: ${readmeQs[0].answer}`;
    }
    if (genericQs.length) {
      genericQuestions = genericQs.map(q => {
        const clean = q.text.replace(/^\[G\d?\]\s*/, '');
        return `[G] ${clean}\nA: ${q.answer}`;
      }).join('\n\n');
    }
  }

  return {
    success: true,
    repo: `${owner}/${repo}`,
    files: fileResults,
    readmeQuestions,
    genericQuestions,
    warnings,
    summary: { successfulFiles: fileResults.length, totalFiles: topFiles.length, totalQuestions },
    timing: { totalMs: 0 },
  };
}

const worker = new Worker(
  'code-analysis',
  async (job) => {
    const { repoUrl, jobId } = job.data;
    console.log(`[Worker] Processing ${jobId}: ${repoUrl}`);
    const startTime = Date.now();

    try {
      await supabase.from('jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', jobId);
      const result = await analyzeRepo(repoUrl, jobId);
      await supabase.from('jobs').update({ status: 'completed', result, updated_at: new Date().toISOString() }).eq('id', jobId);
      console.log(`[Worker] Job ${jobId} completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      console.error(`[Worker] Job ${jobId} failed:`, error);
      await supabase.from('jobs').update({ status: 'failed', error: error.message, updated_at: new Date().toISOString() }).eq('id', jobId);
      throw error;
    }
  },
  { connection: { url: REDIS_URL }, concurrency: 5 }
);

console.log('[Worker] Started, waiting for jobs...');