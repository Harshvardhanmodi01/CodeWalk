/**
 * tests/fileScoring.test.ts
 *
 * Unit tests for fileScoring.ts
 * Covers:
 *   - scoreFiles(): centrality ranking
 *   - scoreFiles(): complexity ranking
 *   - scoreFiles(): combined signal ranking
 *   - scoreFiles(): topN slicing
 *   - scoreFiles(): fallback for missing AST
 *   - topFilesFromScored()
 */

import { describe, it, expect } from 'vitest';
import {
  scoreFiles,
  topFilesFromScored,
  COMPLEXITY_WEIGHT,
  CENTRALITY_WEIGHT,
  FALLBACK_COMPLEXITY_SCORE,
  DEFAULT_TOP_N,
  type ScoredFile,
} from '../app/lib/fileScoring';
import type { GithubFileEntry } from '../app/lib/fileExclusion';
import type { ASTAnalysis } from '../app/lib/astAnalyzer';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function entry(filePath: string): GithubFileEntry {
  return {
    name: filePath.split('/').at(-1) ?? filePath,
    path: filePath,
    type: 'file',
    download_url: `https://raw.example.com/${filePath}`,
    size: 200,
  };
}

/**
 * Minimal ASTAnalysis stub.
 * Only `complexity` is used by fileScoring.ts; everything else is left empty.
 */
function ast(complexity: number): ASTAnalysis {
  return {
    complexity,
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    patterns: [],
  } as unknown as ASTAnalysis;
}

// ---------------------------------------------------------------------------
// scoreFiles() — basic contracts
// ---------------------------------------------------------------------------

describe('scoreFiles() — basic contracts', () => {
  it('returns an empty array for an empty file list', () => {
    expect(scoreFiles([], {}, {})).toEqual([]);
  });

  it('returns at most DEFAULT_TOP_N files by default', () => {
    const files = Array.from({ length: 10 }, (_, i) => entry(`src/file${i}.ts`));
    const result = scoreFiles(files, {}, {});
    expect(result).toHaveLength(DEFAULT_TOP_N);
  });

  it('respects a custom topN argument', () => {
    const files = Array.from({ length: 6 }, (_, i) => entry(`src/file${i}.ts`));
    expect(scoreFiles(files, {}, {}, 2)).toHaveLength(2);
    expect(scoreFiles(files, {}, {}, 6)).toHaveLength(6);
  });

  it('returns all files when topN exceeds file count', () => {
    const files = [entry('a.ts'), entry('b.ts')];
    expect(scoreFiles(files, {}, {}, 99)).toHaveLength(2);
  });

  it('results are sorted by finalScore descending', () => {
    const files = [entry('lo.ts'), entry('hi.ts'), entry('mid.ts')];
    const centralityMap = { 'lo.ts': 1, 'hi.ts': 10, 'mid.ts': 5 };
    const result = scoreFiles(files, {}, centralityMap, 3);
    const scores = result.map((r) => r.finalScore);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[1]).toBeGreaterThanOrEqual(scores[2]);
  });

  it('each result contains the originating GithubFileEntry', () => {
    const files = [entry('src/api.ts')];
    const [scored] = scoreFiles(files, {}, {}, 1);
    expect(scored.file).toEqual(files[0]);
  });

  it('finalScore values are in [0, 1]', () => {
    const files = [entry('a.ts'), entry('b.ts'), entry('c.ts')];
    const astResults = { 'a.ts': ast(10), 'b.ts': ast(3), 'c.ts': ast(1) };
    const centralityMap = { 'a.ts': 5, 'b.ts': 2, 'c.ts': 0 };
    const result = scoreFiles(files, astResults, centralityMap, 3);
    for (const r of result) {
      expect(r.finalScore).toBeGreaterThanOrEqual(0);
      expect(r.finalScore).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// scoreFiles() — centrality ranking
// ---------------------------------------------------------------------------

describe('scoreFiles() — centrality ranking', () => {
  /**
   * All files have identical AST complexity → centralityMap is the
   * only differentiator.
   */
  it('ranks the most-imported file first when complexities are equal', () => {
    const files = [
      entry('hub.ts'),   // imported by 5 others → highest centrality
      entry('mid.ts'),   // imported by 2
      entry('leaf.ts'),  // imported by 0
    ];
    const sharedComplexity = ast(5);
    const astResults = {
      'hub.ts': sharedComplexity,
      'mid.ts': sharedComplexity,
      'leaf.ts': sharedComplexity,
    };
    const centralityMap = { 'hub.ts': 5, 'mid.ts': 2, 'leaf.ts': 0 };

    const [first, second, third] = scoreFiles(files, astResults, centralityMap, 3);
    expect(first.file.path).toBe('hub.ts');
    expect(second.file.path).toBe('mid.ts');
    expect(third.file.path).toBe('leaf.ts');
  });

  it('assigns a centrality score of 1.0 to the most-imported file', () => {
    const files = [entry('hub.ts'), entry('leaf.ts')];
    const centralityMap = { 'hub.ts': 8, 'leaf.ts': 0 };
    const result = scoreFiles(files, {}, centralityMap, 2);
    const hub = result.find((r) => r.file.path === 'hub.ts')!;
    expect(hub.centralityScore).toBe(1.0);
  });

  it('assigns a centrality score of 0 to a file with no importers', () => {
    const files = [entry('hub.ts'), entry('leaf.ts')];
    const centralityMap = { 'hub.ts': 3, 'leaf.ts': 0 };
    const result = scoreFiles(files, {}, centralityMap, 2);
    const leaf = result.find((r) => r.file.path === 'leaf.ts')!;
    expect(leaf.centralityScore).toBe(0);
  });

  it('gives every file a centrality score of 0 when the map is empty', () => {
    const files = [entry('a.ts'), entry('b.ts')];
    const result = scoreFiles(files, {}, {}, 2);
    for (const r of result) expect(r.centralityScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreFiles() — complexity ranking
// ---------------------------------------------------------------------------

describe('scoreFiles() — complexity ranking', () => {
  /**
   * All files have the same centrality → AST complexity is the only signal.
   */
  it('ranks the most-complex file first when centrality is equal', () => {
    const files = [
      entry('simple.ts'),  // low complexity
      entry('medium.ts'),
      entry('complex.ts'), // high complexity
    ];
    const astResults = {
      'simple.ts': ast(2),
      'medium.ts': ast(8),
      'complex.ts': ast(20),
    };
    const centralityMap = { 'simple.ts': 1, 'medium.ts': 1, 'complex.ts': 1 };

    const [first] = scoreFiles(files, astResults, centralityMap, 3);
    expect(first.file.path).toBe('complex.ts');
  });

  it('assigns a complexity score of 1.0 to the most-complex file', () => {
    const files = [entry('complex.ts'), entry('simple.ts')];
    const astResults = { 'complex.ts': ast(30), 'simple.ts': ast(2) };
    const result = scoreFiles(files, astResults, {}, 2);
    const complex = result.find((r) => r.file.path === 'complex.ts')!;
    expect(complex.complexityScore).toBe(1.0);
  });

  it('assigns complexity score of 0 to a file with 0 complexity', () => {
    const files = [entry('a.ts'), entry('b.ts')];
    const astResults = { 'a.ts': ast(10), 'b.ts': ast(0) };
    const result = scoreFiles(files, astResults, {}, 2);
    const b = result.find((r) => r.file.path === 'b.ts')!;
    expect(b.complexityScore).toBe(0);
  });

  it('uses FALLBACK_COMPLEXITY_SCORE when AST result is absent', () => {
    const files = [entry('noAst.ts')];
    const result = scoreFiles(files, {}, {}, 1);
    expect(result[0].complexityScore).toBe(FALLBACK_COMPLEXITY_SCORE);
    expect(result[0].rawComplexity).toBe(-1);
  });

  it('uses FALLBACK for null AST entry', () => {
    const files = [entry('nullAst.ts')];
    const astResults: Record<string, null> = { 'nullAst.ts': null };
    const result = scoreFiles(files, astResults as any, {}, 1);
    expect(result[0].complexityScore).toBe(FALLBACK_COMPLEXITY_SCORE);
  });
});

// ---------------------------------------------------------------------------
// scoreFiles() — combined signals
// ---------------------------------------------------------------------------

describe('scoreFiles() — combined signals', () => {
  /**
   * Scenario: a small-but-central file vs a complex-but-isolated file.
   *
   * hub.ts  : complexity=2, centrality=10  → centralityScore≈1, complexityScore≈0.2
   * deep.ts : complexity=10, centrality=1  → centralityScore≈0.1, complexityScore≈1
   *
   * finalScore(hub)  ≈ 0.5×0.2 + 0.5×1   = 0.6
   * finalScore(deep) ≈ 0.5×1   + 0.5×0.1 = 0.55
   * → hub should rank first
   */
  it('combines complexity and centrality proportionally', () => {
    const files = [entry('hub.ts'), entry('deep.ts')];
    const astResults = { 'hub.ts': ast(2), 'deep.ts': ast(10) };
    const centralityMap = { 'hub.ts': 10, 'deep.ts': 1 };

    const result = scoreFiles(files, astResults, centralityMap, 2);
    expect(result[0].file.path).toBe('hub.ts');
    expect(result[1].file.path).toBe('deep.ts');
  });

  it('reflects the configured COMPLEXITY_WEIGHT and CENTRALITY_WEIGHT', () => {
    const files = [entry('only.ts')];
    const astResults = { 'only.ts': ast(10) };
    const centralityMap = { 'only.ts': 5 };

    // With a single file, complexityScore=1 and centralityScore=1
    const [r] = scoreFiles(files, astResults, centralityMap, 1);
    expect(r.finalScore).toBeCloseTo(COMPLEXITY_WEIGHT * 1 + CENTRALITY_WEIGHT * 1);
  });

  it('weight sum sanity check: COMPLEXITY_WEIGHT + CENTRALITY_WEIGHT === 1', () => {
    // If this fails the configured weights don't sum to 1 — alert the developer
    expect(COMPLEXITY_WEIGHT + CENTRALITY_WEIGHT).toBeCloseTo(1.0);
  });

  it('picks a file that is both complex AND central over files that excel in only one', () => {
    const files = [
      entry('balanced.ts'), // high complexity + high centrality
      entry('hiCentral.ts'), // high centrality only
      entry('hiComplex.ts'), // high complexity only
    ];
    const astResults = {
      'balanced.ts': ast(10),
      'hiCentral.ts': ast(1),
      'hiComplex.ts': ast(10),
    };
    const centralityMap = {
      'balanced.ts': 10,
      'hiCentral.ts': 10,
      'hiComplex.ts': 1,
    };

    const [first] = scoreFiles(files, astResults, centralityMap, 3);
    expect(first.file.path).toBe('balanced.ts');
  });
});

// ---------------------------------------------------------------------------
// topFilesFromScored()
// ---------------------------------------------------------------------------

describe('topFilesFromScored()', () => {
  it('returns GithubFileEntry objects in the same order', () => {
    const files = [entry('a.ts'), entry('b.ts'), entry('c.ts')];
    const fakeScored: ScoredFile[] = files.map((f) => ({
      file: f,
      rawComplexity: 1,
      rawCentrality: 1,
      complexityScore: 0.5,
      centralityScore: 0.5,
      finalScore: 0.5,
    }));
    const result = topFilesFromScored(fakeScored);
    expect(result).toEqual(files);
  });

  it('returns an empty array for an empty scored list', () => {
    expect(topFilesFromScored([])).toEqual([]);
  });

  it('integrates cleanly with scoreFiles() output', () => {
    const files = [entry('main.ts'), entry('utils.ts')];
    const astResults = { 'main.ts': ast(5), 'utils.ts': ast(1) };
    const scored = scoreFiles(files, astResults, {}, 2);
    const extracted = topFilesFromScored(scored);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].path).toBe('main.ts'); // higher complexity → first
  });
});
