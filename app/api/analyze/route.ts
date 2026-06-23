// // import { NextRequest, NextResponse } from 'next/server';
// // import {
// //   extractRepoInfo,
// //   fetchRepoContents,
// //   fetchFileContent,
// //   isCodeFile,
// // } from '@/app/lib/github';
// // import { generateQuestionsRaw } from '@/app/lib/gemini';
// // import { getFilePriority, smartTruncate } from '@/app/lib/utils';

// // // ---------------------------------------------------------------------------
// // // Helper Functions
// // // ---------------------------------------------------------------------------

// // /**
// //  * Counts category tags ([C], [P], [D], [Domain]) in the generated questions string.
// //  */
// // function countCategoryTags(questions: string): Record<string, number> {
// //   return {
// //     '[C]': (questions.match(/\[C\]/g) || []).length,
// //     '[P]': (questions.match(/\[P\]/g) || []).length,
// //     '[D]': (questions.match(/\[D\]/g) || []).length,
// //     '[Domain]': (questions.match(/\[Domain\]/g) || []).length,
// //   };
// // }

// // /**
// //  * Validates that the generated questions contain at least one instance of
// //  * each of the 4 required category tags.
// //  */
// // function isValidQuestions(questions: string): boolean {
// //   const counts = countCategoryTags(questions);
// //   return (
// //     counts['[C]'] > 0 &&
// //     counts['[P]'] > 0 &&
// //     counts['[D]'] > 0 &&
// //     counts['[Domain]'] > 0
// //   );
// // }

// // // ---------------------------------------------------------------------------
// // // GET /api/analyze — Diagnostic endpoint (MERGED with existing GET)
// // // ---------------------------------------------------------------------------

// // export async function GET(): Promise<NextResponse> {
// //   // Diagnostic info for debugging
// //   const hasToken = !!process.env.GITHUB_TOKEN;
// //   const hasGemini = !!process.env.GROQ_API_KEY;
  
// //   // You can return diagnostic info
// //   // Or just return the method not allowed message
// //   // Comment/uncomment as needed:
  
// //   // Option A: Return diagnostic info (for debugging)
// //   return NextResponse.json({
// //     message: 'Method Not Allowed. Use POST to analyze a repository.',
// //     diagnostic: {
// //       githubToken: hasToken ? '✅ Set' : '❌ Missing',
// //       geminiKey: hasGemini ? '✅ Set' : '❌ Missing',
// //       tokenPreview: process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.slice(0, 10) + '...' : 'N/A'
// //     },
// //     allowedMethods: ['POST']
// //   }, { status: 405 });
  
// //   // Option B: Simple method not allowed (remove Option A and uncomment below)
// //   // return NextResponse.json(
// //   //   { error: 'Method Not Allowed. Use POST to analyze a repository.' },
// //   //   { status: 405, headers: { 'Allow': 'POST' } }
// //   // );
// // }

// // // ---------------------------------------------------------------------------
// // // POST /api/analyze
// // // ---------------------------------------------------------------------------

// // export async function POST(request: NextRequest): Promise<NextResponse> {
// //   const startTime = Date.now();

// //   try {
// //     // -----------------------------------------------------------------------
// //     // Step a: Parse and validate request body
// //     // -----------------------------------------------------------------------
// //     let body: { repoUrl?: string };

// //     try {
// //       body = await request.json();
// //     } catch {
// //       return NextResponse.json(
// //         { success: false, error: 'Invalid JSON in request body.' },
// //         { status: 400 }
// //       );
// //     }

// //     const { repoUrl } = body;

// //     if (!repoUrl || typeof repoUrl !== 'string') {
// //       return NextResponse.json(
// //         { success: false, error: 'Missing required field: repoUrl.' },
// //         { status: 400 }
// //       );
// //     }

// //     // Basic GitHub URL validation
// //     const githubUrlPattern =
// //       /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/;

// //     if (!githubUrlPattern.test(repoUrl.trim())) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error:
// //             'Invalid GitHub URL. Expected format: https://github.com/owner/repo',
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step b: Extract owner and repo name
// //     // -----------------------------------------------------------------------
// //     const { owner, repo } = extractRepoInfo(repoUrl.trim());

// //     if (!owner || !repo) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error: 'Could not extract owner/repo from the provided URL.',
// //         },
// //         { status: 400 }
// //       );
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step c: Fetch repository contents
// //     // -----------------------------------------------------------------------
// //     let contents: Array<{
// //       name: string;
// //       type: string;
// //       download_url: string | null;
// //     }>;

// //     try {
// //       contents = await fetchRepoContents(owner, repo);
// //       console.log(`✅ Fetched ${contents.length} items from GitHub`);
// //     } catch (error: unknown) {
// //       const message =
// //         error instanceof Error ? error.message : 'Unknown error';

// //       if (
// //         message.toLowerCase().includes('not found') ||
// //         message.includes('404')
// //       ) {
// //         return NextResponse.json(
// //           {
// //             success: false,
// //             error: `Repository not found: ${owner}/${repo}`,
// //           },
// //           { status: 404 }
// //         );
// //       }

// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error: `Failed to fetch repository contents: ${message}`,
// //         },
// //         { status: 502 }
// //       );
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step d: Find and fetch README
// //     // -----------------------------------------------------------------------
// //     let readmeContext = '';

// //     const readmeFile = contents.find((file) =>
// //       file.name.toLowerCase().includes('readme')
// //     );

// //     if (readmeFile && readmeFile.download_url) {
// //       try {
// //         readmeContext = await fetchFileContent(readmeFile.download_url);
// //         console.log(`✅ README fetched (${readmeContext.length} chars)`);
// //       } catch {
// //         readmeContext = '';
// //       }
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step e: Filter code files
// //     // -----------------------------------------------------------------------
// //     const codeFiles = contents.filter(
// //       (file) => file.type === 'file' && isCodeFile(file.name)
// //     );

// //     console.log(`✅ Found ${codeFiles.length} code files`);

// //     if (codeFiles.length === 0) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error:
// //             'No code files found in the repository root. Ensure the repository contains recognizable source files.',
// //         },
// //         { status: 422 }
// //       );
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step f: Sort by priority
// //     // -----------------------------------------------------------------------
// //     const sortedFiles = [...codeFiles].sort(
// //       (a, b) => getFilePriority(a.name) - getFilePriority(b.name)
// //     );

// //     // -----------------------------------------------------------------------
// //     // Step g: Take top 5 files
// //     // -----------------------------------------------------------------------
// //     const topFiles = sortedFiles.slice(0, 5);

// //     // -----------------------------------------------------------------------
// //     // Step h: Process files SEQUENTIALLY to avoid rate limits
// //     // -----------------------------------------------------------------------
// //     const results: Array<{ fileName: string; questions: string }> = [];
// //     const warnings: string[] = [];

// //     for (const file of topFiles) {
// //       console.log(`🔍 Processing file: ${file.name}`);
      
// //       if (!file.download_url) {
// //         warnings.push(`${file.name}: No download URL available.`);
// //         console.log(`   ❌ No download URL`);
// //         continue;
// //       }

// //       try {
// //         // Fetch file content
// //         const rawContent = await fetchFileContent(file.download_url);
// //         console.log(`   ✅ Fetched ${rawContent.length} chars`);

// //         // Apply smart truncation
// //         const truncationResult = smartTruncate(rawContent);
// //         console.log(`   ✅ Truncated to ${truncationResult.truncatedCode.length} chars`);

// //         const questions = await generateQuestionsRaw(
// //           truncationResult.truncatedCode,
// //           file.name,
// //           readmeContext,
// //           repo
// //         );
        
// //         console.log(`   ✅ Generated ${questions?.length || 0} chars of questions`);

// //         if (questions && questions.trim().length > 0) {
// //           results.push({
// //             fileName: file.name,
// //             questions: questions.trim(),
// //           });
// //         } else {
// //           warnings.push(
// //             `${file.name}: Generation returned empty result.`
// //           );
// //         }
// //       } catch (error: unknown) {
// //         const message =
// //           error instanceof Error ? error.message : 'Unknown error';
// //         console.error(`   ❌ Failed: ${message}`);
// //         warnings.push(`${file.name}: Failed to process — ${message}`);
// //       }
// //     }

// //     // -----------------------------------------------------------------------
// //     // Step i: Handle case where all files failed
// //     // -----------------------------------------------------------------------
// //     if (results.length === 0) {
// //       return NextResponse.json(
// //         {
// //           success: false,
// //           error:
// //             'Question generation failed for all files. Please try again later.',
// //           warnings,
// //         },
// //         { status: 502 }
// //       );
// //     }

// //     // -----------------------------------------------------------------------
// //     // Build response
// //     // -----------------------------------------------------------------------
// //     const totalQuestions = results.reduce((sum, r) => {
// //       const tags = countCategoryTags(r.questions);
// //       return sum + tags['[C]'] + tags['[P]'] + tags['[D]'] + tags['[Domain]'];
// //     }, 0);

// //     const totalMs = Date.now() - startTime;

// //     return NextResponse.json(
// //       {
// //         success: true,
// //         repo: `${owner}/${repo}`,
// //         questions: results,
// //         warnings,
// //         summary: {
// //           successfulFiles: results.length,
// //           totalFiles: topFiles.length,
// //           totalQuestions,
// //         },
// //         timing: { totalMs },
// //       },
// //       { status: 200 }
// //     );
// //   } catch (error: unknown) {
// //     const message =
// //       error instanceof Error ? error.message : 'An unexpected error occurred.';

// //     console.error('❌ POST error:', message);
    
// //     return NextResponse.json(
// //       { success: false, error: message },
// //       { status: 500 }
// //     );
// //   }
// // }
// /**
//  * API route for analyzing a GitHub repository and generating interview questions
//  */
// import { NextRequest, NextResponse } from 'next/server';
// import {
//   extractRepoInfo,
//   fetchRepoContents,
//   fetchFileContent,
//   isCodeFile,
//   getReadme,
// } from '@/app/lib/github';
// import { smartTruncate, getFilePriority, formatDuration } from '@/app/lib/utils';
// import { generateQuestionsRaw } from '@/app/lib/gemini';

// export const maxDuration = 300;

// /**
//  * POST /api/analyze
//  * Body: { repoUrl: string }
//  */
// export async function POST(req: NextRequest) {
//   const start = Date.now();
//   const warnings: string[] = [];

//   try {
//     const body = await req.json().catch(() => ({}));
//     const { repoUrl } = body || {};

//     if (!repoUrl || typeof repoUrl !== 'string') {
//       return NextResponse.json(
//         { success: false, error: 'repoUrl is required' },
//         { status: 400 }
//       );
//     }

//     if (!/^https?:\/\/(www\.)?github\.com\//i.test(repoUrl.trim())) {
//       return NextResponse.json(
//         { success: false, error: 'Invalid GitHub URL' },
//         { status: 400 }
//       );
//     }

//     let owner: string, repo: string;
//     try {
//       ({ owner, repo } = extractRepoInfo(repoUrl));
//     } catch (e: any) {
//       return NextResponse.json({ success: false, error: e.message }, { status: 400 });
//     }

//     console.log(`[analyze] Starting analysis for ${owner}/${repo}`);

//     // Fetch repo contents
//     let contents;
//     try {
//       contents = await fetchRepoContents(owner, repo);
//     } catch (e: any) {
//       console.error('[analyze] fetchRepoContents failed:', e.message);
//       const status = /not found/i.test(e.message) ? 404 : 502;
//       return NextResponse.json({ success: false, error: e.message }, { status });
//     }

//     // Fetch README
//     const readme = await getReadme(owner, repo);
//     if (!readme) warnings.push('No README found - [D] questions may be limited.');

//     // Filter and prioritize code files
//     const codeFiles = contents
//       .filter((f) => f.type === 'file' && isCodeFile(f.name) && f.download_url)
//       .sort((a, b) => getFilePriority(a.path) - getFilePriority(b.path))
//       .slice(0, 5);

//     if (codeFiles.length === 0) {
//       return NextResponse.json(
//         { success: false, error: 'No supported code files found in repository root' },
//         { status: 422 }
//       );
//     }

//     console.log(`[analyze] Processing ${codeFiles.length} files sequentially`);

//     const questions: { fileName: string; questions: string }[] = [];
//     let successCount = 0;

//     // Process sequentially to respect rate limits
//     for (let i = 0; i < codeFiles.length; i++) {
//       const file = codeFiles[i];
//       console.log(`[analyze] (${i + 1}/${codeFiles.length}) ${file.path}`);

//       try {
//         const content = await fetchFileContent(file.download_url!);
//         const { truncatedCode, strategy, percentageKept } = smartTruncate(content);
//         if (strategy !== 'full') {
//           warnings.push(`${file.name}: truncated (${percentageKept}% kept)`);
//         }

//         const generated = await generateQuestionsRaw(
//           truncatedCode,
//           file.name,
//           readme || '',
//           repo
//         );
//         questions.push({ fileName: file.name, questions: generated });
//         successCount++;
//       } catch (e: any) {
//         console.error(`[analyze] File failed: ${file.name}:`, e.message);
//         warnings.push(`${file.name}: ${e.message}`);
//       }
//     }

//     if (successCount === 0) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: 'Question generation failed for all files',
//           warnings,
//         },
//         { status: 502 }
//       );
//     }

//     const totalMs = Date.now() - start;
//     console.log(`[analyze] Done in ${formatDuration(totalMs)} - ${successCount}/${codeFiles.length} files`);

//     return NextResponse.json({
//       success: true,
//       repo: `${owner}/${repo}`,
//       questions,
//       warnings,
//       summary: {
//         successfulFiles: successCount,
//         totalFiles: codeFiles.length,
//         totalQuestions: successCount * 4,
//       },
//       timing: { totalMs },
//     });
//   } catch (e: any) {
//     console.error('[analyze] Unexpected error:', e);
//     return NextResponse.json(
//       { success: false, error: e.message || 'Internal server error', warnings },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * GET /api/analyze - Diagnostic info
//  */
// export async function GET() {
//   return NextResponse.json({
//     status: 'ok',
//     service: 'CodeWalk Analyze',
//     githubToken: process.env.GITHUB_TOKEN ? 'configured' : 'missing',
//     groqApiKey: process.env.GROQ_API_KEY ? 'configured' : 'missing',
//     model: 'llama-3.3-70b-versatile',
//   });
// }
/**
 * POST /api/analyze
 * Analyze a GitHub repository and generate interview questions.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractRepoInfo,
  fetchRepoContents,
  fetchFileContent,
  isCodeFile,
  getReadme,
} from '@/app/lib/github';
import {
  smartTruncate,
  getFilePriority,
  extractLineNumber,
} from '@/app/lib/utils';
import {
  generateQuestionsRaw,
  generateFinalQuestions,
} from '@/app/lib/gemini';

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

/**
 * Walk the repo (1 level deep beyond root) and collect candidate code files.
 */
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
      // Skip noisy directories
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

    const { repoUrl, branch, token, model } = body;
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

    // Fetch repo contents and README in parallel
    let allFiles, readme: string | null;
    try {
      [allFiles, readme] = await Promise.all([
        collectCodeFiles(owner, repo, branch, token),
        getReadme(owner, repo, branch, token),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GitHub fetch failed';
      const status = msg.includes('not found') ? 404 : 502;
      return NextResponse.json(
        { success: false, error: msg },
        { status }
      );
    }

    console.log(`[analyze] Found ${allFiles.length} code files`);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No supported code files found in repository' },
        { status: 422 }
      );
    }

    // Sort by priority then by path length (prefer shallow files)
    const sorted = allFiles
      .map((f) => ({ ...f, priority: getFilePriority(f.path) }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.path.length - b.path.length;
      });

    const topFiles = sorted.slice(0, 3);
    console.log('[analyze] Selected files:', topFiles.map((f) => f.path));

    const fileResults: FileResult[] = [];
    let totalQuestions = 0;

    // Process SEQUENTIALLY
    for (const file of topFiles) {
      try {
        if (!file.download_url) {
          warnings.push(`No download URL for ${file.path}`);
          continue;
        }

        const content = await fetchFileContent(file.download_url, token);
        if (!content || content.trim().length === 0) {
          warnings.push(`Empty file: ${file.path}`);
          continue;
        }

        const { truncatedCode, originalLines, keptLines, strategy } = smartTruncate(content);
        console.log(`[analyze] ${file.path}: ${originalLines}→${keptLines} (${strategy})`);

        const questions = await generateQuestionsRaw(
          truncatedCode,
          file.path,
          readme || undefined,
          repo,
          model
        );

        // Extract referenced line numbers and build snapshots
        const seenLines = new Set<number>();
        const codeSnapshots: CodeSnapshot[] = [];
        const questionLines = questions.split('\n');
        for (const qline of questionLines) {
          if (!/^\[C/.test(qline.trim())) continue;
          const ln = extractLineNumber(qline);
          if (ln && !seenLines.has(ln)) {
            seenLines.add(ln);
            const snippet = buildSnippet(content, ln);
            if (snippet) codeSnapshots.push({ lineNumber: ln, snippet });
          }
        }

        // Count questions
        const qCount = (questions.match(/^\[(C\d?|P\d?)/gm) || []).length;
        totalQuestions += qCount;

        fileResults.push({
          fileName: file.path,
          questions,
          codeSnapshots,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[analyze] Failed ${file.path}:`, msg);
        warnings.push(`Failed to process ${file.path}: ${msg}`);
      }
    }

    if (fileResults.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate questions for any file',
          warnings,
        },
        { status: 502 }
      );
    }

    // Final slide: README + Generic
    let readmeQuestions = '';
    let genericQuestions = '';
    try {
      const hasReadme = !!(readme && readme.trim().length > 0);
      const finalRaw = await generateFinalQuestions(
        readme || '',
        repo,
        model,
        hasReadme
      );
      // Split into [D] vs [G] sections
      const dMatch = finalRaw.match(/\[D\][\s\S]*?(?=\[G1\]|$)/);
      const gMatch = finalRaw.match(/\[G1\][\s\S]*$/);
      readmeQuestions = dMatch && hasReadme ? dMatch[0].trim() : '';
      genericQuestions = gMatch ? gMatch[0].trim() : '';
      const finalCount = (finalRaw.match(/^\[(D|G\d?)/gm) || []).length;
      totalQuestions += finalCount;
    } catch (err) {
      warnings.push(`Final slide generation failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    const totalMs = Date.now() - t0;
    console.log(`[analyze] Done in ${totalMs}ms`);

    return NextResponse.json({
      success: true,
      repo: `${owner}/${repo}`,
      files: fileResults,
      readmeQuestions,
      genericQuestions,
      readme: readme || '',
      warnings,
      summary: {
        successfulFiles: fileResults.length,
        totalFiles: topFiles.length,
        totalQuestions,
      },
      timing: { totalMs },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    console.error('[analyze] Fatal:', msg);
    return NextResponse.json(
      { success: false, error: msg, warnings },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'CodeWalk Analyze API',
    method: 'POST',
    body: { repoUrl: 'https://github.com/owner/repo' },
    githubToken: !!process.env.GITHUB_TOKEN,
    groqKey: !!process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
  });
}
