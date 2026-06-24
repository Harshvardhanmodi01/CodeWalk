/**
 * fileExclusion.ts
 *
 * Hard exclusion pass that runs BEFORE any scoring or file selection.
 * Filters out generated, config, test, and tooling files so downstream
 * analysis only ever sees meaningful source code.
 *
 * Tune the patterns below to your needs — they are intentionally kept
 * in a single top-level constant so they are easy to find and edit.
 */

// ---------------------------------------------------------------------------
// Configurable exclusion patterns
// ---------------------------------------------------------------------------
// Each entry is matched against the full file path (forward-slash normalised).
// Supported pattern types:
//   - exact segment match  → "node_modules", "dist"
//   - glob wildcard        → "*.lock", "*.log"
//   - directory prefix     → "src/"   (matches src/foo.ts but NOT sub/src/foo.ts)
//   - substring anywhere   → checked via minimatch-style rules in matchesExclusion()
// ---------------------------------------------------------------------------
export const EXCLUSION_PATTERNS: string[] = [
  // ── Dependency / build artefacts ──────────────────────────────────────────
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'out',
  '__pycache__',
  'vendor',

  // ── VCS / environment ─────────────────────────────────────────────────────
  '.git',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',

  // ── Test / spec / mock directories & files ────────────────────────────────
  '__tests__',
  'test',
  'tests',
  'spec',
  'specs',
  'mocks',
  '__mocks__',
  'fixtures',
  '*.test.ts',
  '*.test.tsx',
  '*.test.js',
  '*.test.jsx',
  '*.spec.ts',
  '*.spec.tsx',
  '*.spec.js',
  '*.spec.jsx',

  // ── Bundler / transpiler config ───────────────────────────────────────────
  'webpack',
  'rollup',
  'vite',
  'babel',
  'jest',
  'vitest',
  'turbo',
  'esbuild',

  // ── Linter / formatter config ─────────────────────────────────────────────
  'eslint',
  'prettier',
  'stylelint',
  'editorconfig',

  // ── CI / tooling config ───────────────────────────────────────────────────
  '*.yml',
  '*.yaml',
  '*.toml',
  '*.ini',
  '*.cfg',

  // ── Lock / log files ──────────────────────────────────────────────────────
  '*.lock',
  '*.log',

  // ── Documentation & data ─────────────────────────────────────────────────
  '*.md',
  '*.mdx',

  // ── JSON (only generated / config — not source imports) ───────────────────
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig*.json',
  'jsconfig.json',
  '*.json',

  // ── Static / public assets ────────────────────────────────────────────────
  'public',
  'static',
  'assets',

  // ── Misc generated / meta files ───────────────────────────────────────────
  '*.d.ts',         // TypeScript declaration files (generated)
  '*.map',          // Source maps
  '*.min.js',       // Minified bundles
  '*.min.css',
  'coverage',       // Test coverage reports
  '.coverage',
  'storybook',
  '.storybook',
  'generated',
  '__generated__',
];

// ---------------------------------------------------------------------------
// File type expected by worker.ts (mirrors GitHubFile in github.ts)
// ---------------------------------------------------------------------------
export interface GithubFileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  size: number;
  [key: string]: unknown; // allow extra fields to pass through
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise path separators to forward-slash. */
function normalisePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Convert a single .gitignore / glob pattern to a RegExp.
 *
 * Rules handled:
 *   - Leading `!`  → negation (caller handles this flag)
 *   - Trailing `/` → directory-specific (matches the dir name as a path segment)
 *   - `*`          → matches anything except `/`
 *   - `**`         → matches any sequence including `/`
 *   - `?`          → matches any single character except `/`
 *   - Anchored at start when pattern contains `/` (other than a trailing one)
 */
function globToRegex(pattern: string): { regex: RegExp; negate: boolean } {
  let negate = false;
  let p = pattern.trim();

  if (p.startsWith('!')) {
    negate = true;
    p = p.slice(1);
  }

  // Strip leading slash — anchoring is handled separately
  const isAnchored = p.includes('/') && !p.startsWith('*');
  const isDirectoryOnly = p.endsWith('/');
  if (isDirectoryOnly) p = p.slice(0, -1);

  // Escape regex metacharacters except * and ?
  let regexStr = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Replace ** before * to avoid double-processing
  regexStr = regexStr.replace(/\*\*/g, '\x00'); // placeholder
  regexStr = regexStr.replace(/\*/g, '[^/]*');
  regexStr = regexStr.replace(/\x00/g, '.*');
  regexStr = regexStr.replace(/\?/g, '[^/]');

  let fullPattern: string;
  if (isAnchored) {
    // Pattern with internal slash: match from the start of the path
    fullPattern = `^${regexStr}(?:/|$)`;
  } else if (isDirectoryOnly) {
    // Directory-only: match as a path segment anywhere
    fullPattern = `(?:^|/)${regexStr}(?:/|$)`;
  } else {
    // No slash: match as a final path segment or anywhere
    fullPattern = `(?:^|/)${regexStr}(?:/|$|\\.[^/]*$)`;
  }

  return { regex: new RegExp(fullPattern, 'i'), negate };
}

/**
 * Parse .gitignore text into a list of compiled rules.
 * Blank lines and lines starting with `#` are ignored.
 */
function parseGitignore(
  content: string
): Array<{ regex: RegExp; negate: boolean }> {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map(globToRegex);
}

/**
 * Test whether a normalised file path matches a single exclusion pattern.
 *
 * Patterns that contain a `/` (other than a trailing one) are matched against
 * the full path; simple word patterns are matched against each path segment.
 */
function matchesPattern(normPath: string, pattern: string): boolean {
  const p = pattern.trim();
  if (!p) return false;

  // Wildcard patterns — delegate to glob-to-regex
  if (p.includes('*') || p.includes('?')) {
    const { regex } = globToRegex(p);
    return regex.test('/' + normPath);
  }

  // Plain directory / file name: match any path segment
  const segments = normPath.split('/');
  return segments.some(
    (seg) => seg.toLowerCase() === p.replace(/\/$/, '').toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply the hardcoded EXCLUSION_PATTERNS to a list of files.
 * Returns only the files whose path does NOT match any exclusion pattern.
 *
 * @param files      Array of GitHub file entries (from fetchRepoContents).
 * @param patterns   Override the default patterns (useful for testing).
 */
export function excludeFiles(
  files: GithubFileEntry[],
  patterns: string[] = EXCLUSION_PATTERNS
): GithubFileEntry[] {
  return files.filter((file) => {
    const normPath = normalisePath(file.path);
    return !patterns.some((pattern) => matchesPattern(normPath, pattern));
  });
}

/**
 * Parse a raw .gitignore file content and apply those rules on top of any
 * already-filtered list of files.
 *
 * Negation rules (`!pattern`) re-include files that were previously excluded
 * by an earlier rule in the .gitignore — matching standard git behaviour.
 *
 * @param files          Files to filter (should already have passed excludeFiles).
 * @param gitignoreText  Raw text of the .gitignore file.
 */
export function applyGitignore(
  files: GithubFileEntry[],
  gitignoreText: string
): GithubFileEntry[] {
  const rules = parseGitignore(gitignoreText);
  if (rules.length === 0) return files;

  return files.filter((file) => {
    // Prefix with / so anchored patterns work correctly
    const testPath = '/' + normalisePath(file.path);
    let excluded = false;

    for (const { regex, negate } of rules) {
      if (regex.test(testPath)) {
        excluded = !negate; // negation overrides previous exclusion
      }
    }

    return !excluded;
  });
}

/**
 * Convenience wrapper: run the hard exclusion pass then the .gitignore pass.
 *
 * @param files          All files collected from the repo.
 * @param gitignoreText  Raw .gitignore content (pass null if not available).
 * @param patterns       Override the default exclusion patterns.
 */
export function runExclusionPass(
  files: GithubFileEntry[],
  gitignoreText: string | null,
  patterns: string[] = EXCLUSION_PATTERNS
): GithubFileEntry[] {
  let result = excludeFiles(files, patterns);
  if (gitignoreText) {
    result = applyGitignore(result, gitignoreText);
  }
  return result;
}
