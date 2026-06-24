import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Worker } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from './app/lib/github';
import { generateQuestionsForFile, generateFinalQuestions } from './app/lib/gemini';
import { smartTruncate } from './app/lib/utils';
import { analyzeCodeAST } from './app/lib/astAnalyzer';
import { analyzePythonCode } from './app/lib/pythonAstParser';
import { analyzeCodeAST as analyzeCppAST } from './app/lib/astAnalyzerCpp';
import { runExclusionPass } from './app/lib/fileExclusion';
import { buildImportGraph, getInDegrees, type FileWithContent } from './app/lib/importGraph';
import { scoreFiles, topFilesFromScored } from './app/lib/fileScoring';

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

/**
 * Attempt to fetch the repo's .gitignore and return its raw text.
 * Returns null if not present or unreachable.
 */
async function fetchGitignore(owner: string, repo: string): Promise<string | null> {
  try {
    const items = await fetchRepoContents(owner, repo, '');
    const gitignoreEntry = items.find(
      (f) => f.type === 'file' && f.name === '.gitignore' && f.download_url
    );
    if (!gitignoreEntry?.download_url) return null;
    return await fetchFileContent(gitignoreEntry.download_url);
  } catch {
    return null;
  }
}

async function collectCodeFiles(owner: string, repo: string) {
  const root = await fetchRepoContents(owner, repo, '');
  const collected: any[] = [];
  // Pre-exclusion: skip obviously irrelevant top-level dirs to avoid API quota waste
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

  // ── Hard exclusion pass ───────────────────────────────────────────────────
  // Run BEFORE any scoring or selection so no generated/config/test file
  // ever reaches the analysis pipeline.
  const gitignoreText = await fetchGitignore(owner, repo);
  const filtered = runExclusionPass(collected, gitignoreText);
  console.log(
    `[collectCodeFiles] ${collected.length} raw files → ${filtered.length} after exclusion pass` +
    (gitignoreText ? ' (+ .gitignore applied)' : '')
  );
  return filtered;
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

  // ── Phase 1: fetch all content + run AST on every supported file ──────────
  // We need content for the import graph regardless, so fetch eagerly.
  const contentMap: Record<string, string> = {};
  const astMap: Record<string, any> = {};

  await Promise.all(supportedFiles.map(async (file) => {
    if (!file.download_url) return;
    try {
      const content = await fetchFileContent(file.download_url);
      if (!content || content.trim().length === 0) return;
      contentMap[file.path] = content;

      const { truncatedCode } = smartTruncate(content);
      const isJS  = /\.(js|jsx|ts|tsx)$/i.test(file.path);
      const isPy  = /\.py$/i.test(file.path);
      const isCpp = /\.(c|cpp|cc|cxx)$/i.test(file.path);

      if (isJS) {
        try { astMap[file.path] = analyzeCodeAST(truncatedCode, file.path); }
        catch (e) { console.warn(`JS/TS AST failed for ${file.path}:`, e); }
      } else if (isPy) {
        try { astMap[file.path] = await analyzePythonCode(truncatedCode); }
        catch (e) { console.warn(`Python AST failed for ${file.path}:`, e); }
      } else if (isCpp) {
        try { astMap[file.path] = await analyzeCppAST(truncatedCode); }
        catch (e) { console.warn(`C++ AST failed for ${file.path}:`, e); }
      }
    } catch (e) {
      console.warn(`Failed to fetch ${file.path}:`, e);
    }
  }));

  // ── Phase 2: build import graph → centrality ─────────────────────────────
  const filesWithContent: FileWithContent[] = Object.entries(contentMap).map(
    ([path, content]) => ({ path, content })
  );
  const importGraph = buildImportGraph(filesWithContent);
  const centralityMap = getInDegrees(importGraph);  // raw in-degrees

  // ── Phase 3: score + rank → pick top N ───────────────────────────────────
  // scoreFiles() normalises both signals and returns sorted ScoredFile[].
  const scored = scoreFiles(supportedFiles, astMap, centralityMap);
  const topFiles = topFilesFromScored(scored);
  console.log(
    `[analyzeRepo] ${supportedFiles.length} candidates → top ${topFiles.length} selected by scoring`
  );

  const fileResults: Array<{ fileName: string; questions: string; codeSnapshots: Array<{ lineNumber: number; snippet: string }> }> = [];
  let totalQuestions = 0;
  const warnings: string[] = [];

  for (const file of topFiles) {
    // Content and AST already fetched in Phase 1 above
    const content = contentMap[file.path];
    if (!content || content.trim().length === 0) continue;
    const { truncatedCode } = smartTruncate(content);
    const astAnalysis = astMap[file.path] ?? null;

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
    const finalArray = await generateFinalQuestions(readme, repo);
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