/**
 * tests/fileExclusion.test.ts
 *
 * Unit tests for fileExclusion.ts
 * Covers: excludeFiles(), applyGitignore(), runExclusionPass()
 */

import { describe, it, expect } from 'vitest';
import {
  excludeFiles,
  applyGitignore,
  runExclusionPass,
  type GithubFileEntry,
} from '../app/lib/fileExclusion';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal GithubFileEntry from a path string. */
function entry(filePath: string): GithubFileEntry {
  const name = filePath.split('/').at(-1) ?? filePath;
  return {
    name,
    path: filePath,
    type: 'file',
    download_url: `https://raw.example.com/${filePath}`,
    size: 100,
  };
}

// ---------------------------------------------------------------------------
// Fixture file sets
// ---------------------------------------------------------------------------

const SOURCE_FILES: GithubFileEntry[] = [
  entry('src/index.ts'),
  entry('src/utils/helpers.ts'),
  entry('src/components/Button.tsx'),
  entry('app/api/route.ts'),
];

const CONFIG_FILES: GithubFileEntry[] = [
  // These are excluded because their filename OR a path segment exactly matches
  // a pattern word (e.g. "package.json", "tsconfig.json", ".env.local").
  entry('package.json'),
  entry('tsconfig.json'),
  entry('tsconfig.build.json'), // matched by 'tsconfig*.json' glob
  entry('.env.local'),
  entry('.env.production'),
  // Tooling config files that live in a directory named after the tool:
  entry('jest/jest.config.js'),       // 'jest' directory segment matches
  entry('webpack/webpack.config.js'), // 'webpack' directory segment matches
];

const TEST_FILES: GithubFileEntry[] = [
  entry('src/utils/helpers.test.ts'),
  entry('src/components/Button.spec.tsx'),
  entry('__tests__/index.test.ts'),
  entry('tests/helpers.test.js'),
];

const GENERATED_FILES: GithubFileEntry[] = [
  entry('src/generated/schema.ts'),
  entry('src/__generated__/types.ts'),
  entry('dist/index.js'),
  entry('build/app.js'),
  entry('.next/server/app/page.js'),
  entry('node_modules/react/index.js'),
  entry('src/utils/helpers.d.ts'),
  entry('src/bundle.min.js'),
  entry('src/bundle.min.css'),
  entry('coverage/lcov.info'),
];

const ALL_FILES = [
  ...SOURCE_FILES,
  ...CONFIG_FILES,
  ...TEST_FILES,
  ...GENERATED_FILES,
];

// ---------------------------------------------------------------------------
// excludeFiles()
// ---------------------------------------------------------------------------

describe('excludeFiles()', () => {
  it('keeps plain source files untouched', () => {
    const result = excludeFiles(SOURCE_FILES);
    expect(result).toHaveLength(SOURCE_FILES.length);
    expect(result.map((f) => f.path)).toEqual(SOURCE_FILES.map((f) => f.path));
  });

  it('removes config / tooling files', () => {
    const result = excludeFiles(CONFIG_FILES);
    expect(result).toHaveLength(0);
  });

  it('removes test / spec files', () => {
    const result = excludeFiles(TEST_FILES);
    expect(result).toHaveLength(0);
  });

  it('removes generated / build / dist files', () => {
    const result = excludeFiles(GENERATED_FILES);
    expect(result).toHaveLength(0);
  });

  it('keeps only source files from the mixed set', () => {
    const result = excludeFiles(ALL_FILES);
    const paths = result.map((f) => f.path);
    for (const src of SOURCE_FILES) expect(paths).toContain(src.path);
    for (const cfg of CONFIG_FILES) expect(paths).not.toContain(cfg.path);
    for (const tst of TEST_FILES) expect(paths).not.toContain(tst.path);
    for (const gen of GENERATED_FILES) expect(paths).not.toContain(gen.path);
  });

  it('returns all files when a custom empty pattern list is given', () => {
    const result = excludeFiles(ALL_FILES, []);
    expect(result).toHaveLength(ALL_FILES.length);
  });

  it('excludes only the specified custom patterns', () => {
    const files = [entry('src/api.ts'), entry('src/api.test.ts'), entry('README.md')];
    const result = excludeFiles(files, ['*.test.ts']);
    expect(result.map((f) => f.path)).toEqual(['src/api.ts', 'README.md']);
  });

  it('handles an empty file list gracefully', () => {
    expect(excludeFiles([])).toEqual([]);
  });

  it('excludes TypeScript declaration files (*.d.ts)', () => {
    const files = [entry('src/types.d.ts'), entry('src/app.ts')];
    const result = excludeFiles(files);
    expect(result.map((f) => f.path)).toEqual(['src/app.ts']);
  });

  it('excludes minified JS files (*.min.js)', () => {
    const files = [entry('dist/vendor.min.js'), entry('src/main.ts')];
    const result = excludeFiles(files);
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('excludes files inside node_modules at any depth', () => {
    const deep = entry('packages/pkg/node_modules/lodash/index.js');
    expect(excludeFiles([deep])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyGitignore()
// ---------------------------------------------------------------------------

describe('applyGitignore()', () => {
  it('excludes files matched by .gitignore directory patterns', () => {
    // The engine prefixes testPath with '/' — anchored patterns (those with an
    // internal '/') therefore need a leading '/' too.  Non-anchored patterns
    // (no internal '/') match any path segment, which is the common use-case.
    const files = [entry('src/main.ts'), entry('logs/app.log'), entry('tmp/cache.ts')];
    // Simple word patterns match any segment — 'logs' matches the 'logs' directory.
    const gitignore = `
# ignore logs and tmp
logs
tmp
    `.trim();
    const result = applyGitignore(files, gitignore);
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('returns original list when .gitignore is blank or only comments', () => {
    const files = [entry('src/a.ts'), entry('src/b.ts')];
    const result = applyGitignore(files, '# just a comment\n\n');
    expect(result).toHaveLength(2);
  });

  it('supports wildcard glob patterns', () => {
    const files = [
      entry('src/main.ts'),
      entry('src/main.test.ts'),
      entry('src/helpers.test.ts'),
    ];
    const result = applyGitignore(files, '*.test.ts');
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('handles negation rules (! prefix)', () => {
    // Ignore all .ts files BUT keep src/main.ts.
    // The testPath is prefixed with '/' inside applyGitignore, so the
    // negation pattern must be anchored accordingly.
    const files = [entry('src/main.ts'), entry('src/utils.ts')];
    const gitignore = '*.ts\n!/src/main.ts';
    const result = applyGitignore(files, gitignore);
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('returns empty list when .gitignore excludes everything', () => {
    const files = [entry('src/a.ts'), entry('src/b.ts')];
    const result = applyGitignore(files, '**');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// runExclusionPass()
// ---------------------------------------------------------------------------

describe('runExclusionPass()', () => {
  it('applies hard exclusion when gitignoreText is null', () => {
    const files = [entry('src/main.ts'), entry('dist/bundle.js')];
    const result = runExclusionPass(files, null);
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('applies hard exclusion then .gitignore', () => {
    const files = [
      entry('src/main.ts'),
      entry('src/debug.ts'),
      entry('dist/bundle.js'), // removed by hard exclusion
    ];
    // Non-anchored word patterns match any path segment.
    // 'debug' matches the segment 'debug.ts' via the glob-to-regex engine's
    // suffix rule: (?:^|/)debug(?:/|$|\.[^/]*$)
    const gitignore = 'debug';
    const result = runExclusionPass(files, gitignore);
    expect(result.map((f) => f.path)).toEqual(['src/main.ts']);
  });

  it('passes through only clean source files with combined rules', () => {
    const result = runExclusionPass(ALL_FILES, null);
    const paths = result.map((f) => f.path);
    for (const src of SOURCE_FILES) expect(paths).toContain(src.path);
    expect(result.length).toBe(SOURCE_FILES.length);
  });
});
