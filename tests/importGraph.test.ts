/**
 * tests/importGraph.test.ts
 *
 * Unit tests for importGraph.ts
 * Covers:
 *   - extractImportSpecifiers()
 *   - resolveImport()
 *   - buildImportGraph()
 *   - getInDegrees()
 *   - getImportCentrality()
 *   - getImportCentralityFromGraph()
 */

import { describe, it, expect } from 'vitest';
import {
  extractImportSpecifiers,
  resolveImport,
  buildImportGraph,
  getInDegrees,
  getImportCentrality,
  getImportCentralityFromGraph,
  type FileWithContent,
} from '../app/lib/importGraph';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function file(path: string, content: string): FileWithContent {
  return { path, content };
}

// ---------------------------------------------------------------------------
// extractImportSpecifiers()
// ---------------------------------------------------------------------------

describe('extractImportSpecifiers()', () => {
  it('extracts named ES-module imports', () => {
    const src = `import { foo } from './foo';\nimport type { Bar } from './bar';`;
    expect(extractImportSpecifiers(src)).toEqual(['./foo', './bar']);
  });

  it('extracts default imports', () => {
    const src = `import Foo from '../components/Foo';`;
    expect(extractImportSpecifiers(src)).toEqual(['../components/Foo']);
  });

  it('extracts side-effect imports', () => {
    const src = `import './polyfills';`;
    expect(extractImportSpecifiers(src)).toEqual(['./polyfills']);
  });

  it('extracts dynamic import()', () => {
    const src = `const mod = await import('./dynamic');`;
    expect(extractImportSpecifiers(src)).toEqual(['./dynamic']);
  });

  it('extracts CommonJS require()', () => {
    const src = `const x = require('./utils');`;
    expect(extractImportSpecifiers(src)).toEqual(['./utils']);
  });

  it('ignores absolute package imports', () => {
    const src = `import React from 'react';\nimport { foo } from './local';`;
    expect(extractImportSpecifiers(src)).toEqual(['./local']);
  });

  it('handles multiple imports in a single file', () => {
    const src = [
      `import a from './a';`,
      `import b from '../b';`,
      `import 'react';`,         // package — ignored
      `const c = require('./c');`,
    ].join('\n');
    expect(extractImportSpecifiers(src)).toEqual(['./a', '../b', './c']);
  });

  it('returns an empty array for files with no imports', () => {
    expect(extractImportSpecifiers('const x = 42;')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(extractImportSpecifiers('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveImport()
// ---------------------------------------------------------------------------

describe('resolveImport()', () => {
  const fileSet = new Set([
    'src/utils/helpers.ts',
    'src/utils/index.ts',
    'src/components/Button.tsx',
    'src/index.ts',
    'lib/math.js',
  ]);

  it('resolves a specifier that matches exactly', () => {
    expect(resolveImport('src/index.ts', './utils/helpers.ts', fileSet))
      .toBe('src/utils/helpers.ts');
  });

  it('resolves via extension probing (.ts)', () => {
    // specifier has no extension
    expect(resolveImport('src/index.ts', './utils/helpers', fileSet))
      .toBe('src/utils/helpers.ts');
  });

  it('resolves via index file fallback', () => {
    expect(resolveImport('src/index.ts', './utils', fileSet))
      .toBe('src/utils/index.ts');
  });

  it('resolves parent-directory specifiers (..)', () => {
    expect(resolveImport('src/utils/helpers.ts', '../components/Button', fileSet))
      .toBe('src/components/Button.tsx');
  });

  it('returns null for external package specifiers', () => {
    expect(resolveImport('src/index.ts', 'react', fileSet)).toBeNull();
  });

  it('returns null for unresolvable relative paths', () => {
    expect(resolveImport('src/index.ts', './nonexistent', fileSet)).toBeNull();
  });

  it('resolves a file at the repo root', () => {
    // file at root, importing from lib/
    const set = new Set(['lib/math.js', 'main.js']);
    expect(resolveImport('main.js', './lib/math', set)).toBe('lib/math.js');
  });
});

// ---------------------------------------------------------------------------
// buildImportGraph()
// ---------------------------------------------------------------------------

describe('buildImportGraph()', () => {
  /**
   * Fixture graph:
   *   utils.ts  ←──  main.ts
   *   utils.ts  ←──  helper.ts
   *   helper.ts ←──  main.ts
   *
   * In-degrees: utils=2, helper=1, main=0
   */
  const fixtures: FileWithContent[] = [
    file('utils.ts',  'export const x = 1;'),
    file('main.ts',   `import { x } from './utils';\nimport h from './helper';`),
    file('helper.ts', `import { x } from './utils';`),
  ];

  it('creates an entry for every input file', () => {
    const graph = buildImportGraph(fixtures);
    expect(Object.keys(graph.importedBy).sort()).toEqual(['helper.ts', 'main.ts', 'utils.ts']);
    expect(Object.keys(graph.imports).sort()).toEqual(['helper.ts', 'main.ts', 'utils.ts']);
  });

  it('correctly assigns importers (importedBy)', () => {
    const { importedBy } = buildImportGraph(fixtures);
    expect(importedBy['utils.ts'].sort()).toEqual(['helper.ts', 'main.ts']);
    expect(importedBy['helper.ts']).toEqual(['main.ts']);
    expect(importedBy['main.ts']).toEqual([]);
  });

  it('correctly records outgoing imports (imports)', () => {
    const { imports } = buildImportGraph(fixtures);
    expect(imports['main.ts'].sort()).toEqual(['helper.ts', 'utils.ts']);
    expect(imports['helper.ts']).toEqual(['utils.ts']);
    expect(imports['utils.ts']).toEqual([]);
  });

  it('does not create duplicate edges when a file imports the same module twice', () => {
    const dupes: FileWithContent[] = [
      file('a.ts', `import './b';\nimport './b';`),
      file('b.ts', ''),
    ];
    const { imports, importedBy } = buildImportGraph(dupes);
    expect(imports['a.ts']).toHaveLength(1);
    expect(importedBy['b.ts']).toHaveLength(1);
  });

  it('handles an empty file list', () => {
    const graph = buildImportGraph([]);
    expect(graph.importedBy).toEqual({});
    expect(graph.imports).toEqual({});
  });

  it('handles files with no imports', () => {
    const graph = buildImportGraph([file('a.ts', 'const x = 1;'), file('b.ts', '')]);
    expect(graph.importedBy['a.ts']).toEqual([]);
    expect(graph.importedBy['b.ts']).toEqual([]);
  });

  it('ignores external package imports', () => {
    const files: FileWithContent[] = [
      file('app.ts', `import React from 'react';\nimport { foo } from './utils';`),
      file('utils.ts', ''),
    ];
    const { imports } = buildImportGraph(files);
    expect(imports['app.ts']).toEqual(['utils.ts']);
  });
});

// ---------------------------------------------------------------------------
// getInDegrees()
// ---------------------------------------------------------------------------

describe('getInDegrees()', () => {
  it('returns the correct in-degree for each node', () => {
    const graph = buildImportGraph([
      file('utils.ts',  ''),
      file('main.ts',   `import './utils';`),
      file('helper.ts', `import './utils';`),
    ]);
    const degrees = getInDegrees(graph);
    expect(degrees['utils.ts']).toBe(2);
    expect(degrees['main.ts']).toBe(0);
    expect(degrees['helper.ts']).toBe(0);
  });

  it('returns 0 for all files when there are no imports', () => {
    const graph = buildImportGraph([file('a.ts', ''), file('b.ts', '')]);
    const degrees = getInDegrees(graph);
    expect(degrees['a.ts']).toBe(0);
    expect(degrees['b.ts']).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getImportCentrality()
// ---------------------------------------------------------------------------

describe('getImportCentrality()', () => {
  it('returns an empty object for an empty file list', () => {
    expect(getImportCentrality([])).toEqual({});
  });

  it('gives the most-imported file a score of 1.0', () => {
    const files: FileWithContent[] = [
      file('utils.ts',  ''),
      file('main.ts',   `import './utils';`),
      file('helper.ts', `import './utils';`),
    ];
    const scores = getImportCentrality(files);
    expect(scores['utils.ts']).toBe(1.0);
  });

  it('gives a file with no importers a score of 0', () => {
    const files: FileWithContent[] = [
      file('utils.ts',  ''),
      file('main.ts',   `import './utils';`),
    ];
    const scores = getImportCentrality(files);
    expect(scores['main.ts']).toBe(0);
  });

  it('returns 0 for every file when there are no imports at all', () => {
    const files: FileWithContent[] = [file('a.ts', ''), file('b.ts', '')];
    const scores = getImportCentrality(files);
    expect(scores['a.ts']).toBe(0);
    expect(scores['b.ts']).toBe(0);
  });

  it('normalises scores proportionally', () => {
    /**
     * hub.ts  ← a.ts, b.ts, c.ts  → inDegree 3 → score 1.0
     * mid.ts  ← a.ts               → inDegree 1 → score 1/3
     * a, b, c                      → inDegree 0 → score 0
     */
    const files: FileWithContent[] = [
      file('hub.ts', ''),
      file('mid.ts', ''),
      file('a.ts',   `import './hub';\nimport './mid';`),
      file('b.ts',   `import './hub';`),
      file('c.ts',   `import './hub';`),
    ];
    const scores = getImportCentrality(files);
    expect(scores['hub.ts']).toBeCloseTo(1.0);
    expect(scores['mid.ts']).toBeCloseTo(1 / 3);
    expect(scores['a.ts']).toBe(0);
  });

  it('all scores are within [0, 1]', () => {
    const files: FileWithContent[] = [
      file('utils.ts',  ''),
      file('main.ts',   `import './utils';`),
      file('helper.ts', `import './utils';\nimport './main';`),
    ];
    const scores = getImportCentrality(files);
    for (const score of Object.values(scores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// getImportCentralityFromGraph()
// ---------------------------------------------------------------------------

describe('getImportCentralityFromGraph()', () => {
  it('produces the same normalised scores as getImportCentrality()', () => {
    const files: FileWithContent[] = [
      file('utils.ts',  ''),
      file('main.ts',   `import './utils';`),
      file('helper.ts', `import './utils';`),
    ];
    const graph = buildImportGraph(files);
    const fromGraph = getImportCentralityFromGraph(graph);
    const fromFiles = getImportCentrality(files);

    for (const [path, score] of Object.entries(fromFiles)) {
      expect(fromGraph[path]).toBeCloseTo(score);
    }
  });
});
