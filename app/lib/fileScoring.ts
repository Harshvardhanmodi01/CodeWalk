/**
 * fileScoring.ts
 *
 * Combines two signals into a single ranked score for each file so the
 * analysis pipeline can pick the most valuable N files to deep-inspect:
 *
 *   1. AST complexity  – cyclomatic-style count from astAnalyzer
 *   2. Import centrality – normalised in-degree from importGraph
 *
 * Both signals are normalised to [0, 1] before weighting so they are
 * comparable regardless of scale.  Tune the weights and TOP_N below.
 *
 * Normalisation rule (per spec):
 *   score = value / maxValue   →   if maxValue === 0, score = 0
 *
 * Debug logging:
 *   Set the environment variable  DEBUG=true  to print per-file score
 *   breakdowns to stdout.  The flag is checked once at module load time.
 */

import type { ASTAnalysis } from './astAnalyzer';
import type { GithubFileEntry } from './fileExclusion';

// ---------------------------------------------------------------------------
// Configurable constants  ← tune these
// ---------------------------------------------------------------------------

/** Weight applied to the normalised complexity score (0–1). */
export const COMPLEXITY_WEIGHT = 0.5;

/** Weight applied to the normalised import-centrality score (0–1). */
export const CENTRALITY_WEIGHT = 0.5;

/**
 * Default number of top files to return.
 * Pass a different value as the `topN` argument to scoreFiles() to override.
 */
export const DEFAULT_TOP_N = 3;

/**
 * Fallback complexity score assigned to files whose AST analysis failed
 * or produced no data.  0.5 keeps them in the running without inflating
 * their rank above genuinely complex files.
 */
export const FALLBACK_COMPLEXITY_SCORE = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One entry in the ranked output of scoreFiles(). */
export interface ScoredFile {
  /** The original file entry (path, download_url, etc.). */
  file: GithubFileEntry;
  /** Raw complexity value from AST analysis (or -1 if AST data was absent). */
  rawComplexity: number;
  /** Raw in-degree from the import graph (number of importers). */
  rawCentrality: number;
  /** Normalised complexity score in [0, 1]. */
  complexityScore: number;
  /** Normalised centrality score in [0, 1]. */
  centralityScore: number;
  /** Weighted final score: COMPLEXITY_WEIGHT·complexity + CENTRALITY_WEIGHT·centrality. */
  finalScore: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** True when the DEBUG environment variable is set to the string "true". */
const DEBUG_ENABLED = process.env.DEBUG === 'true';

/** Safely divide, returning 0 when maxValue is 0. */
function normalise(value: number, maxValue: number): number {
  return maxValue === 0 ? 0 : value / maxValue;
}

/** Write a formatted score row to stdout (only when DEBUG=true). */
function debugLog(label: string, row: ScoredFile): void {
  if (!DEBUG_ENABLED) return;
  console.log(
    `[fileScoring] ${label}\n` +
    `  complexity : ${row.rawComplexity} → ${row.complexityScore.toFixed(4)} (×${COMPLEXITY_WEIGHT})\n` +
    `  centrality : ${row.rawCentrality} → ${row.centralityScore.toFixed(4)} (×${CENTRALITY_WEIGHT})\n` +
    `  finalScore : ${row.finalScore.toFixed(4)}`
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score and rank a set of files using AST complexity and import centrality.
 *
 * @param files
 *   The file entries to score.  These should already have passed the
 *   exclusion pass (excludeFiles / runExclusionPass).
 *
 * @param astResults
 *   Map of file path → ASTAnalysis result.  Files with no entry (AST failed
 *   or language not supported) receive FALLBACK_COMPLEXITY_SCORE.
 *
 * @param centralityMap
 *   Map of file path → raw in-degree count, as returned by getInDegrees()
 *   from importGraph.ts.  Files not present are treated as in-degree 0.
 *
 * @param topN
 *   How many top-ranked files to return (default: DEFAULT_TOP_N).
 *
 * @returns
 *   Array of ScoredFile, sorted by finalScore descending, capped at topN.
 */
export function scoreFiles(
  files: GithubFileEntry[],
  astResults: Record<string, ASTAnalysis | null>,
  centralityMap: Record<string, number>,
  topN: number = DEFAULT_TOP_N
): ScoredFile[] {
  if (files.length === 0) return [];

  // ── Gather raw values ──────────────────────────────────────────────────────
  const rawComplexities = files.map((f) => {
    const ast = astResults[f.path];
    // null / undefined → AST unavailable; use sentinel -1 (detected below)
    return ast != null ? ast.complexity : -1;
  });

  const rawCentralities = files.map((f) => centralityMap[f.path] ?? 0);

  // ── Compute max values for normalisation ──────────────────────────────────
  // Only consider files where AST actually ran (complexity ≥ 0) for maxComplexity
  const validComplexities = rawComplexities.filter((c) => c >= 0);
  const maxComplexity = validComplexities.length > 0 ? Math.max(...validComplexities) : 0;
  const maxCentrality = Math.max(0, ...rawCentralities);

  // ── Build scored rows ─────────────────────────────────────────────────────
  const scored: ScoredFile[] = files.map((file, i) => {
    const rawC = rawComplexities[i];
    const rawG = rawCentralities[i];

    // Normalise complexity; fall back to FALLBACK_COMPLEXITY_SCORE when AST absent
    const complexityScore =
      rawC < 0 ? FALLBACK_COMPLEXITY_SCORE : normalise(rawC, maxComplexity);

    const centralityScore = normalise(rawG, maxCentrality);

    const finalScore =
      COMPLEXITY_WEIGHT * complexityScore + CENTRALITY_WEIGHT * centralityScore;

    const row: ScoredFile = {
      file,
      rawComplexity: rawC,
      rawCentrality: rawG,
      complexityScore,
      centralityScore,
      finalScore,
    };

    debugLog(file.path, row);
    return row;
  });

  // ── Sort descending, slice to topN ────────────────────────────────────────
  scored.sort((a, b) => b.finalScore - a.finalScore);

  if (DEBUG_ENABLED) {
    console.log(
      `[fileScoring] Ranked ${scored.length} files → returning top ${Math.min(topN, scored.length)}`
    );
  }

  return scored.slice(0, topN);
}

/**
 * Convenience helper: extract just the GithubFileEntry objects from a
 * scoreFiles() result — useful when callers only need the ordered list.
 */
export function topFilesFromScored(scored: ScoredFile[]): GithubFileEntry[] {
  return scored.map((s) => s.file);
}
