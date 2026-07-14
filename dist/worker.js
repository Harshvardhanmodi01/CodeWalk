"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars for local development.
// On Railway, env vars are injected directly into process.env (no file needed).
// dotenv silently ignores missing files, so these calls are safe in production.
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.local') }); // local dev
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.production') }); // fallback
dotenv.config(); // .env fallback
const bullmq_1 = require("bullmq");
const supabase_js_1 = require("@supabase/supabase-js");
const github_1 = require("./app/lib/github");
const gemini_1 = require("./app/lib/gemini");
const utils_1 = require("./app/lib/utils");
const astAnalyzer_1 = require("./app/lib/astAnalyzer");
const pythonAstParser_1 = require("./app/lib/pythonAstParser");
const astAnalyzerCpp_1 = require("./app/lib/astAnalyzerCpp");
const fileExclusion_1 = require("./app/lib/fileExclusion");
const importGraph_1 = require("./app/lib/importGraph");
const fileScoring_1 = require("./app/lib/fileScoring");
const REDIS_URL = process.env.REDIS_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';
function buildSnippet(code, lineNumber) {
    const lines = code.split('\n');
    const idx = lineNumber - 1;
    if (idx < 0 || idx >= lines.length)
        return '';
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length, idx + 6);
    const out = [];
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
async function fetchGitignore(owner, repo) {
    try {
        const items = await (0, github_1.fetchRepoContents)(owner, repo, '');
        const gitignoreEntry = items.find((f) => f.type === 'file' && f.name === '.gitignore' && f.download_url);
        if (!gitignoreEntry?.download_url)
            return null;
        return await (0, github_1.fetchFileContent)(gitignoreEntry.download_url);
    }
    catch {
        return null;
    }
}
async function collectCodeFiles(owner, repo) {
    const root = await (0, github_1.fetchRepoContents)(owner, repo, '');
    const collected = [];
    // Pre-exclusion: skip obviously irrelevant top-level dirs to avoid API quota waste
    const skipDirs = new Set(['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static']);
    for (const item of root) {
        if (item.type === 'file' && (0, github_1.isCodeFile)(item.name)) {
            collected.push(item);
        }
        else if (item.type === 'dir' && !skipDirs.has(item.name)) {
            try {
                const sub = await (0, github_1.fetchRepoContents)(owner, repo, item.path);
                for (const s of sub) {
                    if (s.type === 'file' && (0, github_1.isCodeFile)(s.name))
                        collected.push(s);
                }
            }
            catch { /* ignore */ }
        }
    }
    // ── Hard exclusion pass ───────────────────────────────────────────────────
    // Run BEFORE any scoring or selection so no generated/config/test file
    // ever reaches the analysis pipeline.
    const gitignoreText = await fetchGitignore(owner, repo);
    const filtered = (0, fileExclusion_1.runExclusionPass)(collected, gitignoreText);
    console.log(`[collectCodeFiles] ${collected.length} raw files → ${filtered.length} after exclusion pass` +
        (gitignoreText ? ' (+ .gitignore applied)' : ''));
    return filtered;
}
async function analyzeRepo(repoUrl, jobId) {
    const { owner, repo } = (0, github_1.extractRepoInfo)(repoUrl);
    const readme = await (0, github_1.getReadme)(owner, repo);
    const allFiles = await collectCodeFiles(owner, repo);
    if (allFiles.length === 0)
        throw new Error('No supported code files found');
    // Supported extensions: JS/TS, Python, C/C++
    const supportedFiles = allFiles.filter(f => /\.(js|jsx|ts|tsx|py|c|cpp|cc|cxx)$/i.test(f.path));
    if (supportedFiles.length === 0) {
        throw new Error('No JavaScript/TypeScript, Python, or C/C++ files found');
    }
    // ── Phase 1: fetch all content + run AST on every supported file ──────────
    // We need content for the import graph regardless, so fetch eagerly.
    const contentMap = {};
    const astMap = {};
    await Promise.all(supportedFiles.map(async (file) => {
        if (!file.download_url)
            return;
        try {
            const content = await (0, github_1.fetchFileContent)(file.download_url);
            if (!content || content.trim().length === 0)
                return;
            contentMap[file.path] = content;
            const { truncatedCode } = (0, utils_1.smartTruncate)(content);
            const isJS = /\.(js|jsx|ts|tsx)$/i.test(file.path);
            const isPy = /\.py$/i.test(file.path);
            const isCpp = /\.(c|cpp|cc|cxx)$/i.test(file.path);
            if (isJS) {
                try {
                    astMap[file.path] = (0, astAnalyzer_1.analyzeCodeAST)(truncatedCode, file.path);
                }
                catch (e) {
                    console.warn(`JS/TS AST failed for ${file.path}:`, e);
                }
            }
            else if (isPy) {
                try {
                    astMap[file.path] = await (0, pythonAstParser_1.analyzePythonCode)(truncatedCode);
                }
                catch (e) {
                    console.warn(`Python AST failed for ${file.path}:`, e);
                }
            }
            else if (isCpp) {
                try {
                    astMap[file.path] = await (0, astAnalyzerCpp_1.analyzeCodeAST)(truncatedCode);
                }
                catch (e) {
                    console.warn(`C++ AST failed for ${file.path}:`, e);
                }
            }
        }
        catch (e) {
            console.warn(`Failed to fetch ${file.path}:`, e);
        }
    }));
    // ── Phase 2: build import graph → centrality ─────────────────────────────
    const filesWithContent = Object.entries(contentMap).map(([path, content]) => ({ path, content }));
    const importGraph = (0, importGraph_1.buildImportGraph)(filesWithContent);
    const centralityMap = (0, importGraph_1.getInDegrees)(importGraph); // raw in-degrees
    // ── Phase 3: score + rank → pick top N ───────────────────────────────────
    // scoreFiles() normalises both signals and returns sorted ScoredFile[].
    const scored = (0, fileScoring_1.scoreFiles)(supportedFiles, astMap, centralityMap);
    const topFiles = (0, fileScoring_1.topFilesFromScored)(scored);
    console.log(`[analyzeRepo] ${supportedFiles.length} candidates → top ${topFiles.length} selected by scoring`);
    const fileResults = [];
    let totalQuestions = 0;
    const warnings = [];
    for (const file of topFiles) {
        // Content and AST already fetched in Phase 1 above
        const content = contentMap[file.path];
        if (!content || content.trim().length === 0)
            continue;
        const { truncatedCode } = (0, utils_1.smartTruncate)(content);
        const astAnalysis = astMap[file.path] ?? null;
        let questionsArray = [];
        try {
            questionsArray = await (0, gemini_1.generateQuestionsForFile)(truncatedCode, file.path, readme || undefined, repo, astAnalysis);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            warnings.push(`Failed to generate questions for ${file.path}: ${msg}`);
            continue;
        }
        const codeSnapshots = [];
        for (const q of questionsArray) {
            if (q.lineStart && !codeSnapshots.some(s => s.lineNumber === q.lineStart)) {
                const snippet = buildSnippet(content, q.lineStart);
                if (snippet)
                    codeSnapshots.push({ lineNumber: q.lineStart, snippet });
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
        const finalArray = await (0, gemini_1.generateFinalQuestionsJson)(readme, repo);
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
const worker = new bullmq_1.Worker('code-analysis', async (job) => {
    const { repoUrl, jobId, sessionId } = job.data; // ← added sessionId
    console.log(`[Worker] Processing ${jobId}: ${repoUrl}`);
    const startTime = Date.now();
    try {
        await supabase.from('jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', jobId);
        const result = await analyzeRepo(repoUrl, jobId);
        await supabase.from('jobs').update({ status: 'completed', result, updated_at: new Date().toISOString() }).eq('id', jobId);
        // ── NEW: Store result in sessions table (JSONB) ──────────────────────
        if (sessionId) {
            const { error: updateSessionError } = await supabase
                .from('sessions')
                .update({ status: 'completed', result })
                .eq('id', sessionId);
            if (updateSessionError) {
                console.error(`[Worker] Failed to update session ${sessionId}:`, updateSessionError);
            }
            else {
                console.log(`[Worker] Session ${sessionId} updated with result`);
            }
        }
        else {
            console.warn('[Worker] No sessionId provided – skipping sessions update');
        }
        console.log(`[Worker] Job ${jobId} completed in ${Date.now() - startTime}ms`);
    }
    catch (error) {
        console.error(`[Worker] Job ${jobId} failed:`, error);
        await supabase.from('jobs').update({ status: 'failed', error: error.message, updated_at: new Date().toISOString() }).eq('id', jobId);
        throw error;
    }
}, { connection: { url: REDIS_URL }, concurrency: 5 });
console.log('[Worker] Started, waiting for jobs...');
