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
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from '@/app/lib/github';
import { smartTruncate, getFilePriority, extractLineNumber } from '@/app/lib/utils';
import { generateQuestionsRaw, generateFinalQuestions } from '@/app/lib/gemini';

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
      { success: false, error: msg, warnings: warnings.length ? warnings : undefined },
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