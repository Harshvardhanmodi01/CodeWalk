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
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
const bullmq_1 = require("bullmq");
const supabase_js_1 = require("@supabase/supabase-js");
const github_1 = require("./app/lib/github");
const gemini_1 = require("./app/lib/gemini");
const utils_1 = require("./app/lib/utils");
const astAnalyzer_1 = require("./app/lib/astAnalyzer");
const pythonAstParser_1 = require("./app/lib/pythonAstParser");
const astAnalyzerCpp_1 = require("./app/lib/astAnalyzerCpp");
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
async function collectCodeFiles(owner, repo) {
    const root = await (0, github_1.fetchRepoContents)(owner, repo, '');
    const collected = [];
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
    return collected;
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
    const sorted = supportedFiles
        .map((f) => ({ ...f, priority: (0, utils_1.getFilePriority)(f.path) }))
        .sort((a, b) => a.priority - b.priority || a.path.length - b.path.length);
    const topFiles = sorted.slice(0, 3);
    const fileResults = [];
    let totalQuestions = 0;
    const warnings = [];
    for (const file of topFiles) {
        if (!file.download_url)
            continue;
        const content = await (0, github_1.fetchFileContent)(file.download_url);
        if (!content || content.trim().length === 0)
            continue;
        const { truncatedCode } = (0, utils_1.smartTruncate)(content);
        let astAnalysis = null;
        const isJS = /\.(js|jsx|ts|tsx)$/i.test(file.path);
        const isPython = /\.py$/i.test(file.path);
        const isCpp = /\.(c|cpp|cc|cxx)$/i.test(file.path);
        if (isJS) {
            try {
                astAnalysis = (0, astAnalyzer_1.analyzeCodeAST)(truncatedCode, file.path);
            }
            catch (err) {
                console.warn(`JS/TS AST failed for ${file.path}:`, err);
            }
        }
        else if (isPython) {
            try {
                astAnalysis = await (0, pythonAstParser_1.analyzePythonCode)(truncatedCode);
            }
            catch (err) {
                console.warn(`Python AST failed for ${file.path}:`, err);
            }
        }
        else if (isCpp) {
            try {
                astAnalysis = await (0, astAnalyzerCpp_1.analyzeCodeAST)(truncatedCode);
            }
            catch (err) {
                console.warn(`C++ AST failed for ${file.path}:`, err);
            }
        }
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
        const finalArray = await (0, gemini_1.generateFinalQuestions)(readme, repo);
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
    const { repoUrl, jobId } = job.data;
    console.log(`[Worker] Processing ${jobId}: ${repoUrl}`);
    const startTime = Date.now();
    try {
        await supabase.from('jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', jobId);
        const result = await analyzeRepo(repoUrl, jobId);
        await supabase.from('jobs').update({ status: 'completed', result, updated_at: new Date().toISOString() }).eq('id', jobId);
        console.log(`[Worker] Job ${jobId} completed in ${Date.now() - startTime}ms`);
    }
    catch (error) {
        console.error(`[Worker] Job ${jobId} failed:`, error);
        await supabase.from('jobs').update({ status: 'failed', error: error.message, updated_at: new Date().toISOString() }).eq('id', jobId);
        throw error;
    }
}, { connection: { url: REDIS_URL }, concurrency: 5 });
console.log('[Worker] Started, waiting for jobs...');
