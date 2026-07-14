// import { NextRequest, NextResponse } from 'next/server';
// import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from '@/app/lib/github';
// import { smartTruncate, getFilePriority, extractLineNumber } from '@/app/lib/utils';
// import { generateQuestionsRaw, generateFinalQuestions } from '@/app/lib/gemini';
// import { createServerSupabaseClient } from '@/app/lib/supabaseServer';

// export const runtime = 'nodejs';
// export const maxDuration = 60;

// const GITHUB_URL_REGEX =
//   /^https?:\/\/(?:www\.)?github\.com\/[^/\s]+\/[^/\s?#]+\/?$/i;

// interface CodeSnapshot {
//   lineNumber: number;
//   snippet: string;
// }

// interface FileResult {
//   fileName: string;
//   questions: string;
//   codeSnapshots: CodeSnapshot[];
// }

// /**
//  * Extract a 5-lines-before / 5-lines-after snippet around the given line.
//  */
// function buildSnippet(code: string, lineNumber: number): string {
//   const lines = code.split('\n');
//   const idx = lineNumber - 1;
//   if (idx < 0 || idx >= lines.length) return '';
//   const start = Math.max(0, idx - 5);
//   const end = Math.min(lines.length, idx + 6);
//   const out: string[] = [];
//   for (let i = start; i < end; i++) {
//     const marker = i === idx ? '→ ►' : '  ';
//     out.push(`${marker} ${i + 1}: ${lines[i]}`);
//   }
//   return out.join('\n');
// }

// /**
//  * Walk the repo (1 level deep beyond root) and collect candidate code files.
//  */
// async function collectCodeFiles(
//   owner: string,
//   repo: string
// ): Promise<Array<{ name: string; path: string; download_url: string | null; size: number }>> {
//   const root = await fetchRepoContents(owner, repo, '');
//   const collected: Array<{ name: string; path: string; download_url: string | null; size: number }> = [];

//   for (const item of root) {
//     if (item.type === 'file' && isCodeFile(item.name)) {
//       collected.push(item);
//     } else if (item.type === 'dir') {
//       // Skip noisy directories
//       const skip = ['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static'];
//       if (skip.includes(item.name)) continue;
//       try {
//         const sub = await fetchRepoContents(owner, repo, item.path);
//         for (const s of sub) {
//           if (s.type === 'file' && isCodeFile(s.name)) {
//             collected.push(s);
//           }
//         }
//       } catch {
//         // ignore subdir failures
//       }
//     }
//   }
//   return collected;
// }

// export async function POST(request: NextRequest) {
//   const t0 = Date.now();
//   const warnings: string[] = [];

//   try {
//     // ==================== AUTHENTICATION ====================
//     const supabase = createServerSupabaseClient();
//     const { data: { session } } = await supabase.auth.getSession();
//     if (!session) {
//       return NextResponse.json(
//         { success: false, error: 'Unauthorized – please log in' },
//         { status: 401 }
//       );
//     }
//     const userId = session.user.id;
//     const userEmail = session.user.email!;

//     // Get user's name from profiles table
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('name')
//       .eq('id', userId)
//       .single();
//     const userName = profile?.name || userEmail.split('@')[0] || 'User';

//     // ==================== REQUEST BODY ====================
//     const body = await request.json().catch(() => null);
//     if (!body || typeof body.repoUrl !== 'string') {
//       return NextResponse.json(
//         { success: false, error: 'Missing or invalid repoUrl in request body' },
//         { status: 400 }
//       );
//     }

//     const repoUrl: string = body.repoUrl.trim();
//     if (!GITHUB_URL_REGEX.test(repoUrl)) {
//       return NextResponse.json(
//         { success: false, error: 'Invalid GitHub URL format' },
//         { status: 400 }
//       );
//     }

//     // ==================== STORE SUBMISSION ====================
//     const { error: insertError } = await supabase.from('submissions').insert({
//       name: userName,
//       email: userEmail,
//       repo_url: repoUrl,
//     });
//     if (insertError) {
//       console.error('Failed to insert submission:', insertError);
//       // Not fatal – we still continue analysis
//       warnings.push(`Could not save submission record: ${insertError.message}`);
//     }

//     console.log('[analyze] Start →', repoUrl);

//     let owner: string, repo: string;
//     try {
//       ({ owner, repo } = extractRepoInfo(repoUrl));
//     } catch (err) {
//       return NextResponse.json(
//         { success: false, error: err instanceof Error ? err.message : 'Invalid URL' },
//         { status: 400 }
//       );
//     }

//     // Fetch repo contents and README in parallel
//     let allFiles, readme: string | null;
//     try {
//       [allFiles, readme] = await Promise.all([
//         collectCodeFiles(owner, repo),
//         getReadme(owner, repo),
//       ]);
//     } catch (err) {
//       const msg = err instanceof Error ? err.message : 'GitHub fetch failed';
//       const status = msg.includes('not found') ? 404 : 502;
//       return NextResponse.json(
//         { success: false, error: msg },
//         { status }
//       );
//     }

//     console.log(`[analyze] Found ${allFiles.length} code files`);

//     if (allFiles.length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'No supported code files found in repository' },
//         { status: 422 }
//       );
//     }

//     // Sort by priority then by path length (prefer shallow files)
//     const sorted = allFiles
//       .map((f) => ({ ...f, priority: getFilePriority(f.path) }))
//       .sort((a, b) => {
//         if (a.priority !== b.priority) return a.priority - b.priority;
//         return a.path.length - b.path.length;
//       });

//     const topFiles = sorted.slice(0, 3);
//     console.log('[analyze] Selected files:', topFiles.map((f) => f.path));

//     const fileResults: FileResult[] = [];
//     let totalQuestions = 0;

//     // Process sequentially
//     for (const file of topFiles) {
//       try {
//         if (!file.download_url) {
//           warnings.push(`No download URL for ${file.path}`);
//           continue;
//         }

//         const content = await fetchFileContent(file.download_url);
//         if (!content || content.trim().length === 0) {
//           warnings.push(`Empty file: ${file.path}`);
//           continue;
//         }

//         const { truncatedCode, originalLines, keptLines, strategy } = smartTruncate(content);
//         console.log(`[analyze] ${file.path}: ${originalLines}→${keptLines} (${strategy})`);

//         const questions = await generateQuestionsRaw(
//           truncatedCode,
//           file.path,
//           readme || undefined,
//           repo
//         );

//         // Extract referenced line numbers and build snapshots
//         const seenLines = new Set<number>();
//         const codeSnapshots: CodeSnapshot[] = [];
//         const questionLines = questions.split('\n');
//         for (const qline of questionLines) {
//           if (!/^\[C/.test(qline.trim())) continue;
//           const ln = extractLineNumber(qline);
//           if (ln && !seenLines.has(ln)) {
//             seenLines.add(ln);
//             const snippet = buildSnippet(content, ln);
//             if (snippet) codeSnapshots.push({ lineNumber: ln, snippet });
//           }
//         }

//         // Count questions
//         const qCount = (questions.match(/^\[(C\d?|P\d?)/gm) || []).length;
//         totalQuestions += qCount;

//         fileResults.push({
//           fileName: file.path,
//           questions,
//           codeSnapshots,
//         });
//       } catch (err) {
//         const msg = err instanceof Error ? err.message : 'Unknown error';
//         console.error(`[analyze] Failed ${file.path}:`, msg);
//         warnings.push(`Failed to process ${file.path}: ${msg}`);
//       }
//     }

//     if (fileResults.length === 0) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Failed to generate questions for any file',
//           warnings,
//         },
//         { status: 502 }
//       );
//     }

//     // Final slide: README + Generic
//     let readmeQuestions = '';
//     let genericQuestions = '';
//     try {
//       const finalRaw = await generateFinalQuestions(readme || `Project: ${repo}`, repo);
//       // Split into [D] vs [G] sections
//       const dMatch = finalRaw.match(/\[D\][\s\S]*?(?=\[G1\]|$)/);
//       const gMatch = finalRaw.match(/\[G1\][\s\S]*$/);
//       readmeQuestions = dMatch ? dMatch[0].trim() : '';
//       genericQuestions = gMatch ? gMatch[0].trim() : '';
//       const finalCount = (finalRaw.match(/^\[(D|G\d?)/gm) || []).length;
//       totalQuestions += finalCount;
//     } catch (err) {
//       warnings.push(`Final slide generation failed: ${err instanceof Error ? err.message : 'unknown'}`);
//     }

//     const totalMs = Date.now() - t0;
//     console.log(`[analyze] Done in ${totalMs}ms`);

//     return NextResponse.json({
//       success: true,
//       repo: `${owner}/${repo}`,
//       files: fileResults,
//       readmeQuestions,
//       genericQuestions,
//       warnings,
//       summary: {
//         successfulFiles: fileResults.length,
//         totalFiles: topFiles.length,
//         totalQuestions,
//       },
//       timing: { totalMs },
//     });
//   } catch (err) {
//     const msg = err instanceof Error ? err.message : 'Unknown server error';
//     console.error('[analyze] Fatal:', msg);
//     return NextResponse.json(
//       { success: false, error: msg, warnings: warnings.length ? warnings : undefined },
//       { status: 500 }
//     );
//   }
// }

// export async function GET() {
//   return NextResponse.json({
//     name: 'CodeWalk Analyze API',
//     method: 'POST',
//     body: { repoUrl: 'https://github.com/owner/repo' },
//     githubToken: !!process.env.GITHUB_TOKEN,
//     groqKey: !!process.env.GROQ_API_KEY,
//     model: 'llama-3.3-70b-versatile',
//   });
// }
import { NextRequest, NextResponse } from 'next/server';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile, getReadme, fetchGitHub } from '@/app/lib/github';
import { smartTruncate, getFilePriority, extractLineNumber } from '@/app/lib/utils';
import { generateQuestionsRaw, generateFinalQuestions } from '@/app/lib/gemini';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { enqueueAnalysis } from '@/app/lib/queue';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GITHUB_URL_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/[^/\s]+\/[^/\s?#]+\/?$/i;

interface CodeSnapshot {
  lineNumber: number;
  snippet: string;
}

interface FileResult {
  fileName: string;
  questions: string;
  codeSnapshots: CodeSnapshot[];
}

function buildSnippet(code: string, lineNumber: number): string {
  const lines = code.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return '';
  const start = Math.max(0, idx - 5);
  const end = Math.min(lines.length, idx + 6);
  return lines.slice(start, end).join('\n');
}

// Heuristics score function for guest files to find the most meaningful code files
function getGuestFileScore(path: string, size: number): number {
  const ext = path.slice(((path.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  
  // Exclude ignored paths and files
  const skipDirs = ['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static'];
  if (skipDirs.some(dir => path.split('/').includes(dir))) {
    return -999;
  }
  
  const skipFiles = ['package-lock.json', '.env', 'yarn.lock', 'pnpm-lock.yaml', 'package.json', 'tsconfig.json', 'eslint.config.js', 'next.config.js', 'next.config.mjs'];
  const filename = path.split('/').pop() || '';
  if (skipFiles.includes(filename)) {
    return -999;
  }

  // Image and binary extensions
  const ignoredExts = [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'tiff', 'bmp',
    'pdf', 'zip', 'tar', 'gz', 'rar', 'exe', 'dll', 'so', 'dylib', 'woff', 'woff2', 'eot', 'ttf'
  ];
  if (ignoredExts.includes(ext)) {
    return -999;
  }

  // Size constraints: prefer 500 bytes to 100KB
  if (size < 100 || size > 150000) {
    return -100;
  }

  let score = 0;

  // Preferred extensions
  const preferredExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'java'];
  if (preferredExts.includes(ext)) {
    score += 100;
  } else {
    const okExts = ['rs', 'c', 'cpp', 'h', 'hpp', 'rb', 'php', 'swift', 'kt', 'scala', 'cs', 'vue', 'svelte'];
    if (okExts.includes(ext)) {
      score += 50;
    }
  }

  // Prefer shallower files
  const slashCount = (path.match(/\//g) || []).length;
  score -= slashCount * 5;

  return score;
}

// Fetch recursive file tree from GitHub Trees API
async function fetchRepoTreeRecursive(
  owner: string,
  repo: string,
  token?: string,
  branch?: string
): Promise<any[]> {
  let ref = branch;
  if (!ref) {
    // Try to get default branch
    try {
      const repoRes = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}`, token);
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        ref = repoData.default_branch;
      }
    } catch (e) {
      console.warn("Failed to get default branch:", e);
    }
  }
  if (!ref) ref = 'main'; // default fallback

  let treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  let res = await fetchGitHub(treeUrl, token);
  if (!res.ok && ref === 'main' && !branch) {
    ref = 'master';
    treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    res = await fetchGitHub(treeUrl, token);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch repository tree: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.tree || [];
}

async function collectCodeFiles(
  owner: string,
  repo: string,
  branch?: string,
  token?: string
): Promise<Array<{ name: string; path: string; download_url: string | null; size: number }>> {
  const root = await fetchRepoContents(owner, repo, '', branch, token);
  const collected: Array<{ name: string; path: string; download_url: string | null; size: number }> = [];

  for (const item of root) {
    if (item.type === 'file' && isCodeFile(item.name)) {
      collected.push(item);
    } else if (item.type === 'dir') {
      const skip = ['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static'];
      if (skip.includes(item.name)) continue;
      try {
        const sub = await fetchRepoContents(owner, repo, item.path, branch, token);
        for (const s of sub) {
          if (s.type === 'file' && isCodeFile(s.name)) {
            collected.push(s);
          }
        }
      } catch {
        // ignore subdir failures
      }
    }
  }
  return collected;
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  const warnings: string[] = [];

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.repoUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid repoUrl in request body' },
        { status: 400 }
      );
    }

    const { repoUrl, branch, token, model, guestSessionId } = body;
    const finalRepoUrl = repoUrl.trim();

    if (!GITHUB_URL_REGEX.test(finalRepoUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub URL format' },
        { status: 400 }
      );
    }

    console.log('[analyze] Start →', finalRepoUrl, 'branch:', branch, 'model:', model);

    let owner: string, repo: string;
    try {
      ({ owner, repo } = extractRepoInfo(finalRepoUrl));
    } catch (err) {
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : 'Invalid URL' },
        { status: 400 }
      );
    }

    // ==================== AUTHENTICATION CHECK ====================
    const supabaseClient = await createServerSupabaseClient();
    const { data: { session } } = await supabaseClient.auth.getSession();
    const isGuest = !session;

    if (isGuest) {
      console.log("[analyze] Guest User session detected. Checking limits...");
      
      // Get client IP
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');
      const ipKey = `guest_ip_${ip}`;
      const sessionKey = guestSessionId ? `guest_session_${guestSessionId}` : null;
      
      // Query submissions count for this guest
      let count = 0;
      
      const { count: ipCount, error: ipError } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('email', ipKey);
        
      if (ipError) {
        console.error("Supabase count query error (IP):", ipError.message);
      } else {
        count = ipCount || 0;
      }
      
      if (sessionKey) {
        const { count: sessionCount, error: sessionError } = await supabaseAdmin
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('email', sessionKey);
          
        if (sessionError) {
          console.error("Supabase count query error (Session):", sessionError.message);
        } else {
          count = Math.max(count, sessionCount || 0);
        }
      }
      
      if (count >= 3) {
        return NextResponse.json(
          { success: false, error: 'You have reached the limit of 3 free walkthroughs in Guest Mode. Please sign up or log in to get unlimited walkthroughs!' },
          { status: 429 }
        );
      }

      // ==================== GUEST ROUTE PIPELINE ====================
      console.log(`[analyze] Guest starting walkthrough for ${owner}/${repo} (IP: ${ip})`);
      
      // 1. Fetch the repo file tree recursively
      let tree: any[] = [];
      try {
        tree = await fetchRepoTreeRecursive(owner, repo, token, branch);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch repository tree';
        const status = msg.includes('not found') ? 404 : 502;
        return NextResponse.json({ success: false, error: `GitHub fetch failed: ${msg}` }, { status });
      }
      
      // 2. Score and filter files to pick top candidate code files
      const scoredFiles = tree
        .map((f: any) => ({
          path: f.path,
          size: f.size || 0,
          type: f.type,
          score: getGuestFileScore(f.path, f.size || 0)
        }))
        .filter((f: any) => f.type === 'blob' && f.score > 0)
        .sort((a: any, b: any) => b.score - a.score);

      if (scoredFiles.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No supported source code files found in repository. We support .ts, .tsx, .js, .jsx, .py, .go, .java and other language files.' },
          { status: 422 }
        );
      }

      // 3. Fetch file contents sequentially, skipping empty or invalid ones
      const selectedFiles: Array<{ path: string; content: string }> = [];
      const filesToTry = scoredFiles.slice(0, 10); // Try up to 10 best files to find 3-5 valid ones
      
      for (const file of filesToTry) {
        if (selectedFiles.length >= 5) break;
        try {
          const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${file.path}`;
          const content = await fetchFileContent(downloadUrl, token);
          if (content && content.trim().length > 100) {
            selectedFiles.push({ path: file.path, content: content.trim() });
          }
        } catch (err) {
          console.warn(`Failed to fetch file content for guest: ${file.path}`, err);
          // Try fallback if branch was not main (master/etc)
          try {
            const fallbackUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'master'}/${file.path}`;
            const content = await fetchFileContent(fallbackUrl, token);
            if (content && content.trim().length > 100) {
              selectedFiles.push({ path: file.path, content: content.trim() });
            }
          } catch (e2) {
            console.warn(`Fallback fetch also failed for: ${file.path}`);
          }
        }
      }

      if (selectedFiles.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Failed to read content for any code files in the repository. Please verify that the repository is public and contains source code.' },
          { status: 422 }
        );
      }

      console.log(`[analyze] Selected ${selectedFiles.length} files for Groq prompt`);

      // 4. Call Groq to generate exactly 5 interview questions
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return NextResponse.json(
          { success: false, error: 'GROQ_API_KEY is not configured on the server.' },
          { status: 500 }
        );
      }

      // Build context of code files
      const filesContext = selectedFiles.map((file, idx) => `
FILE #${idx + 1}: ${file.path}
\`\`\`
${file.content.slice(0, 8000)}
\`\`\`
`).join('\n\n');

      const systemPrompt = `You are an expert senior engineer conducting a technical interview.
Analyze the provided code files from the repository and generate EXACTLY 5 high-quality, professional technical interview questions.

Each question must target a specific, interesting part of the code in one of the files.
You must return a JSON object with a single key "questions" containing an array of exactly 5 question objects.

Each question object must match this schema:
{
  "question": "Question text asking about a design pattern, logic, tradeoff, or bug at a specific place",
  "snippet": "The exact code snippet from the file being questioned (5-15 lines of context showing the relevant lines)",
  "fileName": "The path of the file containing this code",
  "difficulty": "easy" | "medium" | "hard",
  "category": "frontend" | "backend" | "dsa" | "system-design",
  "answer": "The ideal answer key to this question (2-4 sentences)"
}

Rules:
1. Questions should be insightful. Avoid generic questions like "What does this file do?". Ask about specific architectural decisions, tradeoffs, edge cases, or potential bugs in the code.
2. Ensure you specify the correct "fileName" and extract the correct "snippet" from that file.
3. The difficulty must be either "easy", "medium", or "hard".
4. The category must be one of: "frontend", "backend", "dsa", "system-design".
5. Return ONLY the raw JSON. Do not include markdown formatting or backticks around the JSON.`;

      const userPrompt = `
Repository Name: ${owner}/${repo}

Here are the selected source code files:
${filesContext}

Generate exactly 5 questions following the instructions.`;

      const groq = new Groq({ apiKey: groqKey });
      let questionsList: any[] = [];
      let groqErrorMsg = '';

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const resContent = completion.choices?.[0]?.message?.content;
        if (!resContent) {
          throw new Error('Groq returned an empty response.');
        }

        const parsed = JSON.parse(resContent);
        if (parsed && Array.isArray(parsed.questions)) {
          questionsList = parsed.questions;
        } else {
          throw new Error('Groq did not return a valid JSON object matching the requested schema.');
        }
      } catch (err: any) {
        console.error("Groq execution failed:", err);
        groqErrorMsg = err.message || 'Unknown Groq error';
      }

      if (questionsList.length === 0) {
        return NextResponse.json(
          { success: false, error: `Groq AI generation failed: ${groqErrorMsg}. Please check repository structure or try again.` },
          { status: 502 }
        );
      }

      // Make sure we have exactly 5 questions
      const finalQuestions = questionsList.slice(0, 5).map((q: any, index: number) => ({
        id: `guest-q-${index + 1}`,
        question: q.question || 'Explain this section of the code.',
        snippet: q.snippet || '',
        fileName: q.fileName || selectedFiles[0]?.path || 'source_code',
        difficulty: q.difficulty || 'medium',
        category: q.category || 'backend',
        answer: q.answer || 'Ideal answer not available.'
      }));

      // 5. Store guest submission in Supabase
      try {
        const primaryKey = sessionKey || ipKey;
        await supabaseAdmin.from('submissions').insert({
          name: 'Guest User',
          email: primaryKey,
          repo_url: finalRepoUrl,
        });
      } catch (err: any) {
        console.error("Failed to store guest submission:", err.message);
        // Do not crash, as analysis succeeded
      }

      const totalMs = Date.now() - t0;
      return NextResponse.json({
        success: true,
        isGuest: true,
        repo: `${owner}/${repo}`,
        questions: finalQuestions,
        timing: { totalMs }
      });
    }

    // ==================== QUEUE-BASED PIPELINE (Railway Worker) ====================
    // For authenticated users we enqueue the job and return immediately.
    // The Railway worker picks it up, runs analyzeRepo(), and writes the result to
    // the jobs table in Supabase. The client polls /api/job/:id until completed.

    const jobId = crypto.randomUUID();

    // 1. Create a pending job record so the client can poll its status
    const { error: jobInsertError } = await supabaseAdmin
      .from('jobs')
      .insert({
        id: jobId,
        status: 'pending',
        repo_url: finalRepoUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (jobInsertError) {
      console.error('[analyze] Failed to insert job record:', jobInsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to initialise analysis job. Please try again.' },
        { status: 500 }
      );
    }

    // 2. Push to the BullMQ queue — Railway worker will process this
    try {
      await enqueueAnalysis({ repoUrl: finalRepoUrl, jobId, sessionId: null });
    } catch (queueErr: any) {
      console.error('[analyze] Failed to enqueue job:', queueErr);
      // Roll back the pending job record so we don't leave orphans
      try { await supabaseAdmin.from('jobs').delete().eq('id', jobId); } catch (_) {}
      return NextResponse.json(
        { success: false, error: 'Failed to queue analysis job. Is REDIS_URL configured?' },
        { status: 500 }
      );
    }

    console.log(`[analyze] Job ${jobId} enqueued for ${finalRepoUrl}`);

    // 3. Return immediately — client polls /api/job/:id for status
    return NextResponse.json({
      success: true,
      queued: true,
      jobId,
      status: 'pending',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[analyze] Fatal:', msg);
    return NextResponse.json(
      { success: false, error: msg, warnings: warnings.length ? warnings : undefined },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestSessionId = searchParams.get('guestSessionId');

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');
    const ipKey = `guest_ip_${ip}`;
    const sessionKey = guestSessionId ? `guest_session_${guestSessionId}` : null;

    let count = 0;

    const { count: ipCount, error: ipError } = await supabaseAdmin
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('email', ipKey);

    if (ipError) {
      console.error("Supabase count query error (IP):", ipError.message);
    } else {
      count = ipCount || 0;
    }

    if (sessionKey) {
      const { count: sessionCount, error: sessionError } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('email', sessionKey);

      if (sessionError) {
        console.error("Supabase count query error (Session):", sessionError.message);
      } else {
        count = Math.max(count, sessionCount || 0);
      }
    }

    const remaining = Math.max(0, 3 - count);
    return NextResponse.json({
      success: true,
      count,
      remaining
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}