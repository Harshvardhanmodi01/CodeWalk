// // // app/lib/utils.ts

// // /**
// //  * @fileoverview CodeWalk utility functions.
// //  * Pure TypeScript utilities with zero external dependencies.
// //  */

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Types
// // // ─────────────────────────────────────────────────────────────────────────────

// // export interface TruncationResult {
// //   truncatedCode: string;
// //   originalLines: number;
// //   keptLines: number;
// //   percentageKept: number;
// //   strategy: 'full' | 'top-bottom' | 'top-middle-bottom';
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // A. smartTruncate
// // // ─────────────────────────────────────────────────────────────────────────────

// // /**
// //  * Intelligently truncates source code while preserving the most relevant
// //  * portions (entry/exit points and structural midpoints).
// //  *
// //  * @param code - The raw source code string to truncate.
// //  * @param maxLines - Optional override for the maximum lines to retain.
// //  *                   Defaults to 600 for medium files, 800 for large files.
// //  * @returns A `TruncationResult` containing the truncated code and metadata.
// //  *
// //  * @example
// //  * ```ts
// //  * const result = smartTruncate(largeFileContents);
// //  * console.log(result.strategy);       // 'top-middle-bottom'
// //  * console.log(result.percentageKept); // 30.0
// //  * ```
// //  */
// // export function smartTruncate(
// //   code: string,
// //   maxLines?: number
// // ): TruncationResult {
// //   const lines = code.split('\n');
// //   const originalLines = lines.length;

// //   // Strategy: full — file is small enough to keep entirely
// //   if (originalLines <= (maxLines ?? 600)) {
// //     return {
// //       truncatedCode: code,
// //       originalLines,
// //       keptLines: originalLines,
// //       percentageKept: 100,
// //       strategy: 'full',
// //     };
// //   }

// //   // Strategy: top-middle-bottom — medium files (600–2000 lines)
// //   if (originalLines <= 2000) {
// //     const keepCount = maxLines ?? 600;
// //     const topCount = Math.floor(keepCount * 0.4);
// //     const middleCount = Math.floor(keepCount * 0.2);
// //     const bottomCount = keepCount - topCount - middleCount;

// //     const middleStart = Math.floor((originalLines - middleCount) / 2);

// //     const topSection = lines.slice(0, topCount);
// //     const middleSection = lines.slice(middleStart, middleStart + middleCount);
// //     const bottomSection = lines.slice(originalLines - bottomCount);

// //     const topTruncated = middleStart - topCount;
// //     const middleTruncated =
// //       originalLines - bottomCount - (middleStart + middleCount);

// //     const assembled = [
// //       ...topSection,
// //       `// ... [${topTruncated} lines truncated] ...`,
// //       ...middleSection,
// //       `// ... [${middleTruncated} lines truncated] ...`,
// //       ...bottomSection,
// //     ];

// //     const keptLines = topCount + middleCount + bottomCount;

// //     return {
// //       truncatedCode: assembled.join('\n'),
// //       originalLines,
// //       keptLines,
// //       percentageKept: parseFloat(
// //         ((keptLines / originalLines) * 100).toFixed(1)
// //       ),
// //       strategy: 'top-middle-bottom',
// //     };
// //   }

// //   // Strategy: top-bottom — large files (> 2000 lines)
// //   const keepCount = maxLines ?? 800;
// //   const topCount = Math.floor(keepCount * 0.5);
// //   const bottomCount = keepCount - topCount;

// //   const topSection = lines.slice(0, topCount);
// //   const bottomSection = lines.slice(originalLines - bottomCount);

// //   const truncatedCount = originalLines - topCount - bottomCount;

// //   const assembled = [
// //     ...topSection,
// //     `// ... [${truncatedCount} lines truncated] ...`,
// //     ...bottomSection,
// //   ];

// //   const keptLines = topCount + bottomCount;

// //   return {
// //     truncatedCode: assembled.join('\n'),
// //     originalLines,
// //     keptLines,
// //     percentageKept: parseFloat(
// //       ((keptLines / originalLines) * 100).toFixed(1)
// //     ),
// //     strategy: 'top-bottom',
// //   };
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // B. getFilePriority
// // // ─────────────────────────────────────────────────────────────────────────────

// // /** Priority tier definitions mapping basename patterns to numeric priority. */
// // const PRIORITY_TIERS: ReadonlyArray<{
// //   priority: number;
// //   patterns: readonly RegExp[];
// // }> = [
// //   {
// //     priority: 0,
// //     patterns: [
// //       /^index\./i,
// //       /^main\./i,
// //       /^app\./i,
// //       /^server\./i,
// //       /^core\./i,
// //     ],
// //   },
// //   {
// //     priority: 1,
// //     patterns: [
// //       /^utils?\./i,
// //       /^helpers?\./i,
// //       /^api\./i,
// //       /^services?\./i,
// //       /^controllers?\./i,
// //       /^models?\./i,
// //     ],
// //   },
// //   {
// //     priority: 2,
// //     patterns: [
// //       /^components?\./i,
// //       /^views?\./i,
// //       /^pages?\./i,
// //       /^routes?\./i,
// //     ],
// //   },
// //   {
// //     priority: 3,
// //     patterns: [
// //       /^config\./i,
// //       /\.config\./i,
// //       /\.test\./i,
// //       /\.spec\./i,
// //       /^tests?\./i,
// //       /^docs?\./i,
// //       /^types?\./i,
// //       /^constants?\./i,
// //     ],
// //   },
// // ];

// // /**
// //  * Determines the processing priority of a file based on its name.
// //  * Lower numbers indicate higher priority (processed first).
// //  *
// //  * Priority levels:
// //  * - **0**: Entry points — `index`, `main`, `app`, `server`, `core`
// //  * - **1**: Logic layer — `utils`, `helpers`, `api`, `services`, `controllers`, `models`
// //  * - **2**: Presentation — `components`, `views`, `pages`, `routes`
// //  * - **3**: Support — `config`, `tests`, `docs`, `types`, `constants`
// //  * - **4**: Everything else
// //  *
// //  * @param filename - The filename or path to evaluate.
// //  * @returns A priority number from 0 (highest) to 4 (lowest).
// //  *
// //  * @example
// //  * ```ts
// //  * getFilePriority('src/index.ts');       // 0
// //  * getFilePriority('lib/utils.ts');       // 1
// //  * getFilePriority('components/Nav.tsx'); // 2
// //  * getFilePriority('tsconfig.json');      // 3
// //  * getFilePriority('README.md');          // 4
// //  * ```
// //  */
// // export function getFilePriority(filename: string): number {
// //   // Extract the basename from a potential file path
// //   const basename = filename.split('/').pop() ?? filename;

// //   for (const tier of PRIORITY_TIERS) {
// //     for (const pattern of tier.patterns) {
// //       if (pattern.test(basename)) {
// //         return tier.priority;
// //       }
// //     }
// //   }

// //   return 4;
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // C. extractLineNumber
// // // ─────────────────────────────────────────────────────────────────────────────

// // /** Ordered patterns for extracting line numbers from text references. */
// // const LINE_NUMBER_PATTERNS: readonly RegExp[] = [
// //   /\[Line\s*(\d+)\]/i,
// //   /#L(\d+)/i,
// //   /\bL(\d+)\b/i,
// //   /\bline\s*(\d+)\b/i,
// // ];

// // /**
// //  * Extracts the first line number reference from a string of text.
// //  * Recognizes common patterns used in code reviews, annotations, and URLs.
// //  *
// //  * Supported formats:
// //  * - `[Line 42]` or `[line 42]`
// //  * - `line 42` or `Line 42`
// //  * - `L42`
// //  * - `#L42` (GitHub-style permalink fragments)
// //  *
// //  * @param text - The text to search for line number references.
// //  * @returns The extracted line number, or `null` if no match is found.
// //  *
// //  * @example
// //  * ```ts
// //  * extractLineNumber('See [Line 15] for the bug');  // 15
// //  * extractLineNumber('Check line 200 in utils.ts'); // 200
// //  * extractLineNumber('github.com/file#L99');        // 99
// //  * extractLineNumber('No reference here');          // null
// //  * ```
// //  */
// // export function extractLineNumber(text: string): number | null {
// //   for (const pattern of LINE_NUMBER_PATTERNS) {
// //     const match = pattern.exec(text);
// //     if (match?.[1]) {
// //       const num = parseInt(match[1], 10);
// //       if (num > 0 && Number.isFinite(num)) {
// //         return num;
// //       }
// //     }
// //   }

// //   return null;
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // D. formatDuration
// // // ─────────────────────────────────────────────────────────────────────────────

// // /**
// //  * Formats a duration in milliseconds into a human-readable string.
// //  *
// //  * - Values ≥ 1000ms are displayed in seconds with one decimal place (e.g. `"2.3s"`).
// //  * - Values < 1000ms are displayed as whole milliseconds (e.g. `"145ms"`).
// //  * - Negative values are treated as 0ms.
// //  *
// //  * @param ms - Duration in milliseconds.
// //  * @returns A formatted duration string.
// //  *
// //  * @example
// //  * ```ts
// //  * formatDuration(2345);  // "2.3s"
// //  * formatDuration(145);   // "145ms"
// //  * formatDuration(0);     // "0ms"
// //  * formatDuration(1000);  // "1.0s"
// //  * ```
// //  */
// // export function formatDuration(ms: number): string {
// //   const clamped = Math.max(0, ms);

// //   if (clamped >= 1000) {
// //     return `${(clamped / 1000).toFixed(1)}s`;
// //   }

// //   return `${Math.round(clamped)}ms`;
// // }

// // // ─────────────────────────────────────────────────────────────────────────────
// // // E. validateGitHubUrl
// // // ─────────────────────────────────────────────────────────────────────────────

// // /**
// //  * Validates whether a string is a well-formed GitHub repository URL.
// //  *
// //  * Accepted format: `https://github.com/{owner}/{repo}`
// //  *
// //  * Rules:
// //  * - Must use `https` protocol.
// //  * - Owner and repo must consist of alphanumeric characters, hyphens, underscores, or dots.
// //  * - Trailing slashes and additional path segments (branches, files) are allowed.
// //  *
// //  * @param url - The URL string to validate.
// //  * @returns `true` if the URL matches a valid GitHub repository pattern.
// //  *
// //  * @example
// //  * ```ts
// //  * validateGitHubUrl('https://github.com/vercel/next.js');     // true
// //  * validateGitHubUrl('https://github.com/user/repo/tree/main'); // true
// //  * validateGitHubUrl('http://github.com/user/repo');           // false (http)
// //  * validateGitHubUrl('https://gitlab.com/user/repo');          // false (not GitHub)
// //  * validateGitHubUrl('not-a-url');                             // false
// //  * ```
// //  */
// // export function validateGitHubUrl(url: string): boolean {
// //   const GITHUB_REPO_PATTERN =
// //     /^https:\/\/github\.com\/[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+(?:\/.*)?$/;

// //   return GITHUB_REPO_PATTERN.test(url.trim());
// // }
// /**
//  * Utility functions for code processing and formatting
//  */

// interface TruncateResult {
//   truncatedCode: string;
//   originalLines: number;
//   keptLines: number;
//   percentageKept: number;
//   strategy: string;
// }

// /**
//  * Smart truncation that preserves the most relevant portions of code.
//  * - <=600 lines: full file
//  * - 600-2000: 40% top + 20% middle + 40% bottom (600 kept)
//  * - >2000: 50% top + 50% bottom (800 kept)
//  */
// export function smartTruncate(code: string, maxLines: number = 600): TruncateResult {
//   const lines = code.split('\n');
//   const originalLines = lines.length;

//   if (originalLines <= maxLines) {
//     return {
//       truncatedCode: code,
//       originalLines,
//       keptLines: originalLines,
//       percentageKept: 100,
//       strategy: 'full',
//     };
//   }

//   if (originalLines <= 2000) {
//     const keep = 600;
//     const topCount = Math.floor(keep * 0.4);
//     const midCount = Math.floor(keep * 0.2);
//     const bottomCount = keep - topCount - midCount;

//     const top = lines.slice(0, topCount);
//     const midStart = Math.floor(originalLines / 2) - Math.floor(midCount / 2);
//     const middle = lines.slice(midStart, midStart + midCount);
//     const bottom = lines.slice(originalLines - bottomCount);

//     const truncatedCode = [
//       ...top,
//       `// ... [${midStart - topCount} lines truncated] ...`,
//       ...middle,
//       `// ... [${originalLines - bottomCount - (midStart + midCount)} lines truncated] ...`,
//       ...bottom,
//     ].join('\n');

//     return {
//       truncatedCode,
//       originalLines,
//       keptLines: keep,
//       percentageKept: Math.round((keep / originalLines) * 100),
//       strategy: 'top-middle-bottom',
//     };
//   }

//   // > 2000 lines
//   const keep = 800;
//   const half = keep / 2;
//   const top = lines.slice(0, half);
//   const bottom = lines.slice(originalLines - half);
//   const truncatedCode = [
//     ...top,
//     `// ... [${originalLines - keep} lines truncated] ...`,
//     ...bottom,
//   ].join('\n');

//   return {
//     truncatedCode,
//     originalLines,
//     keptLines: keep,
//     percentageKept: Math.round((keep / originalLines) * 100),
//     strategy: 'top-bottom',
//   };
// }

// /**
//  * Get priority value for sorting files by importance.
//  * Lower = higher priority.
//  */
// export function getFilePriority(filename: string): number {
//   const lower = filename.toLowerCase();
//   const base = lower.split('/').pop() || lower;

//   if (/^(index|main|app|server|core)\./.test(base)) return 0;
//   if (/(utils|helpers|api|services|controllers|models)/.test(lower)) return 1;
//   if (/(components|views|pages|routes)/.test(lower)) return 2;
//   if (/(config|tests?|docs?|types|constants)/.test(lower)) return 3;
//   return 4;
// }

// /**
//  * Extract a line number from text using common patterns
//  */
// export function extractLineNumber(text: string): number | null {
//   if (!text) return null;
//   const patterns = [
//     /\[Line\s*(\d+)\]/i,
//     /line\s*(\d+)/i,
//     /L(\d+)/i,
//     /#L(\d+)/i,
//   ];
//   for (const p of patterns) {
//     const m = text.match(p);
//     if (m) return parseInt(m[1], 10);
//   }
//   return null;
// }

// /**
//  * Format milliseconds to a human-readable duration
//  */
// export function formatDuration(ms: number): string {
//   if (ms < 1000) return `${Math.round(ms)}ms`;
//   return `${(ms / 1000).toFixed(1)}s`;
// }
/**
 * Utility functions for CodeWalk: smart code truncation,
 * file priority ranking, line number extraction, duration formatting.
 */

interface TruncateResult {
  truncatedCode: string;
  originalLines: number;
  keptLines: number;
  percentageKept: number;
  strategy: string;
}

/**
 * Smart truncation that keeps the most informative parts of a code file.
 * - <=600 lines: full file
 * - 600-2000: 40% top + 20% middle + 40% bottom (600 lines kept)
 * - >2000: 50% top + 50% bottom (800 lines kept)
 */
export function smartTruncate(
  code: string,
  maxLines: number = 600
): TruncateResult {
  const lines = code.split('\n');
  const originalLines = lines.length;

  if (originalLines <= maxLines) {
    return {
      truncatedCode: code,
      originalLines,
      keptLines: originalLines,
      percentageKept: 100,
      strategy: 'full',
    };
  }

  let result: string[] = [];
  let strategy: string;
  let keptLines: number;

  if (originalLines <= 2000) {
    // 40% top + 20% middle + 40% bottom = 600 lines
    const topCount = Math.floor(600 * 0.4);
    const midCount = Math.floor(600 * 0.2);
    const botCount = 600 - topCount - midCount;

    const top = lines.slice(0, topCount);
    const midStart = Math.floor((originalLines - midCount) / 2);
    const middle = lines.slice(midStart, midStart + midCount);
    const bottom = lines.slice(originalLines - botCount);

    const skipBeforeMid = midStart - topCount;
    const skipAfterMid = originalLines - botCount - (midStart + midCount);

    result = [
      ...top,
      `// ... [${skipBeforeMid} lines truncated] ...`,
      ...middle,
      `// ... [${skipAfterMid} lines truncated] ...`,
      ...bottom,
    ];
    strategy = 'top-middle-bottom';
    keptLines = 600;
  } else {
    // 50% top + 50% bottom = 800 lines
    const half = 400;
    const top = lines.slice(0, half);
    const bottom = lines.slice(originalLines - half);
    const skipped = originalLines - 800;

    result = [
      ...top,
      `// ... [${skipped} lines truncated] ...`,
      ...bottom,
    ];
    strategy = 'top-bottom';
    keptLines = 800;
  }

  const truncatedCode = result.join('\n');
  const percentageKept = Math.round((keptLines / originalLines) * 100);

  return {
    truncatedCode,
    originalLines,
    keptLines,
    percentageKept,
    strategy,
  };
}

/**
 * Assign a priority rank for a filename — lower is more important.
 * 0: entry points, 1: utils/api/services, 2: components/views,
 * 3: config/tests/types, 4: everything else
 */
export function getFilePriority(filename: string): number {
  const lower = filename.toLowerCase();
  const base = lower.split('/').pop() || lower;
  const nameOnly = base.replace(/\.[^.]+$/, '');

  const tier0 = ['index', 'main', 'app', 'server', 'core'];
  const tier1 = ['utils', 'helpers', 'api', 'services', 'controllers', 'models', 'helper', 'service', 'controller', 'model'];
  const tier2 = ['components', 'views', 'pages', 'routes', 'component', 'view', 'page', 'route'];
  const tier3 = ['config', 'tests', 'docs', 'types', 'constants', 'test', 'doc', 'type', 'constant'];

  if (tier0.includes(nameOnly)) return 0;

  for (const word of tier1) {
    if (lower.includes(`/${word}/`) || nameOnly.includes(word)) return 1;
  }
  for (const word of tier2) {
    if (lower.includes(`/${word}/`) || nameOnly.includes(word)) return 2;
  }
  for (const word of tier3) {
    if (lower.includes(`/${word}/`) || nameOnly.includes(word)) return 3;
  }

  return 4;
}

/**
 * Extract the first line number found in a string.
 * Tries [Line N], line N, LN, #LN.
 */
export function extractLineNumber(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /\[Line\s*(\d+)\]/i,
    /line\s*(\d+)/i,
    /L(\d+)/i,
    /#L(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/**
 * Format a duration in milliseconds for display.
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms)}ms`;
}
