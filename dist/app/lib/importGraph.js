"use strict";
/**
 * importGraph.ts
 *
 * Builds a lightweight import graph from file contents and scores each file
 * by its in-degree — the number of other files in the repo that import it.
 *
 * Design decisions
 * ────────────────
 * • Uses regex extraction (no heavy AST) as requested.  The patterns cover
 *   ES-module static imports, dynamic import(), and CommonJS require().
 * • Path resolution follows the three-step order from the spec:
 *     1. Exact file match
 *     2. index.js / index.ts
 *     3. Extension probing (.js .ts .jsx .tsx)
 * • Normalisation: score = inDegree / maxInDegree.  If maxInDegree === 0
 *   every file scores 0 (not NaN).
 * • The module is pure (no network calls).  Callers fetch file content and
 *   pass it in via FileWithContent so the scoring can run in any context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractImportSpecifiers = extractImportSpecifiers;
exports.resolveImport = resolveImport;
exports.buildImportGraph = buildImportGraph;
exports.getInDegrees = getInDegrees;
exports.getImportCentrality = getImportCentrality;
exports.getImportCentralityFromGraph = getImportCentralityFromGraph;
// ---------------------------------------------------------------------------
// Regex patterns for import extraction
// ---------------------------------------------------------------------------
/**
 * Matches the following forms and captures the module specifier:
 *   import ... from 'specifier'
 *   import ... from "specifier"
 *   import 'specifier'           (side-effect import)
 *   import("specifier")          (dynamic import)
 *   require('specifier')
 *   require("specifier")
 */
const IMPORT_REGEX = /(?:import\s+(?:[^'"]*\s+from\s+)?|import\s*\(|require\s*\()['"]([^'"]+)['"]/g;
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/** Normalise a path to forward slashes and strip a leading './'. */
function norm(p) {
    return p.replace(/\\/g, '/');
}
/**
 * Extract all module specifiers referenced in a source file.
 * Returns only relative specifiers (starting with '.' or '..').
 * Absolute/package specifiers are ignored.
 */
function extractImportSpecifiers(content) {
    const specifiers = [];
    // Reset lastIndex so re-use is safe
    IMPORT_REGEX.lastIndex = 0;
    let match;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
        const spec = match[1];
        if (spec.startsWith('.')) {
            specifiers.push(spec);
        }
    }
    return specifiers;
}
/**
 * Resolve a relative import specifier from a source file to a concrete path
 * that exists in the known file set.
 *
 * Resolution order (per spec):
 *   1. Exact match
 *   2. <specifier>/index.js  then  <specifier>/index.ts
 *   3. <specifier>.js  .ts  .jsx  .tsx
 *
 * @param sourceFilePath  Repo-relative path of the file doing the importing.
 * @param specifier       The raw specifier string (e.g. './utils', '../api/index').
 * @param fileSet         Set of all known repo-relative paths (forward-slash).
 * @returns               The resolved repo-relative path, or null if unresolvable.
 */
function resolveImport(sourceFilePath, specifier, fileSet) {
    // Compute the directory of the importing file
    const sourceDir = norm(sourceFilePath).split('/').slice(0, -1).join('/');
    // Join the source directory with the specifier and normalise
    const joined = sourceDir ? `${sourceDir}/${specifier}` : specifier;
    // Collapse any '..' / '.' segments
    const parts = [];
    for (const seg of joined.split('/')) {
        if (seg === '..') {
            parts.pop();
        }
        else if (seg !== '.') {
            parts.push(seg);
        }
    }
    const base = parts.join('/');
    // ── Step 1: exact match ──────────────────────────────────────────────────
    if (fileSet.has(base))
        return base;
    // ── Step 2: index files ───────────────────────────────────────────────────
    for (const idx of ['index.js', 'index.ts', 'index.jsx', 'index.tsx']) {
        const candidate = `${base}/${idx}`;
        if (fileSet.has(candidate))
            return candidate;
    }
    // ── Step 3: extension probing ─────────────────────────────────────────────
    for (const ext of ['.js', '.ts', '.jsx', '.tsx']) {
        const candidate = `${base}${ext}`;
        if (fileSet.has(candidate))
            return candidate;
    }
    return null; // external package or unresolvable
}
// ---------------------------------------------------------------------------
// Core graph builder
// ---------------------------------------------------------------------------
/**
 * Build a directed import graph from a set of files and their source content.
 *
 * Edges flow as:  importer  →  importee
 * `importedBy` reverses this:  importee  →  [importers]
 *
 * @param files  Files with their content.  Paths must be repo-relative and
 *               forward-slash normalised (as returned by the GitHub API).
 */
function buildImportGraph(files) {
    // Build a lookup set of all known paths
    const fileSet = new Set(files.map((f) => norm(f.path)));
    const imports = {};
    const importedBy = {};
    // Initialise entries so every file has a key even with zero edges
    for (const f of files) {
        const p = norm(f.path);
        imports[p] = [];
        importedBy[p] = [];
    }
    // Walk every file and resolve its import specifiers
    for (const file of files) {
        const sourcePath = norm(file.path);
        const specifiers = extractImportSpecifiers(file.content);
        for (const spec of specifiers) {
            const resolved = resolveImport(sourcePath, spec, fileSet);
            if (resolved === null)
                continue; // external or unresolvable
            // Avoid duplicate edges (e.g. a file importing the same module twice)
            if (!imports[sourcePath].includes(resolved)) {
                imports[sourcePath].push(resolved);
            }
            if (!importedBy[resolved].includes(sourcePath)) {
                importedBy[resolved].push(sourcePath);
            }
        }
    }
    return { imports, importedBy };
}
// ---------------------------------------------------------------------------
// Public scoring API
// ---------------------------------------------------------------------------
/**
 * Compute the raw in-degree (importer count) for every file.
 *
 * @param graph  A graph produced by buildImportGraph().
 * @returns      Record mapping each file path to its integer in-degree.
 */
function getInDegrees(graph) {
    const degrees = {};
    for (const [path, importers] of Object.entries(graph.importedBy)) {
        degrees[path] = importers.length;
    }
    return degrees;
}
/**
 * Compute a normalised import-centrality score for every file.
 *
 * score = inDegree / maxInDegree
 * If maxInDegree === 0 (no imports found at all), every file scores 0.
 *
 * @param files  Files with their already-fetched content.
 * @returns      Record<filePath, normalisedScore>  (values in [0, 1]).
 */
function getImportCentrality(files) {
    if (files.length === 0)
        return {};
    const graph = buildImportGraph(files);
    const degrees = getInDegrees(graph);
    const maxInDegree = Math.max(...Object.values(degrees));
    const scores = {};
    for (const [path, degree] of Object.entries(degrees)) {
        // Normalisation: value / maxValue; if maxValue === 0 → score is 0
        scores[path] = maxInDegree === 0 ? 0 : degree / maxInDegree;
    }
    return scores;
}
/**
 * Convenience overload: accepts the same graph-building output so callers
 * that already have the graph don't need to rebuild it.
 *
 * @param graph  Pre-built ImportGraph.
 * @returns      Normalised scores keyed by file path.
 */
function getImportCentralityFromGraph(graph) {
    const degrees = getInDegrees(graph);
    const maxInDegree = Math.max(0, ...Object.values(degrees));
    const scores = {};
    for (const [path, degree] of Object.entries(degrees)) {
        scores[path] = maxInDegree === 0 ? 0 : degree / maxInDegree;
    }
    return scores;
}
