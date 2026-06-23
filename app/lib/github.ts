// // // app/lib/github.ts

// // export interface Commit {
// //   sha: string;
// //   message: string;
// //   date: string;
// //   author: string;
// //   url: string;
// // }

// // const CODE_EXTENSIONS: Set<string> = new Set([
// //   '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
// //   '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
// //   '.scala', '.cs', '.vue', '.svelte',
// // ]);

// // const DEFAULT_TIMEOUT = 30_000;
// // const MAX_PAGINATION_PAGES = 3;
// // const DEFAULT_COMMIT_LIMIT = 30;

// // const GITHUB_API_BASE = 'https://api.github.com';

// // const DEFAULT_HEADERS: Record<string, string> = {
// //   Accept: 'application/vnd.github.v3+json',
// // };

// // // ---------------------------------------------------------------------------
// // // Helpers
// // // ---------------------------------------------------------------------------

// // function createAbortSignal(timeoutMs: number = DEFAULT_TIMEOUT): AbortSignal {
// //   const controller = new AbortController();
// //   setTimeout(() => controller.abort(), timeoutMs);
// //   return controller.signal;
// // }

// // function parseLinkHeader(header: string | null): Record<string, string> {
// //   const links: Record<string, string> = {};
// //   if (!header) return links;

// //   const parts = header.split(',');
// //   for (const part of parts) {
// //     const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
// //     if (match) {
// //       links[match[2]] = match[1];
// //     }
// //   }
// //   return links;
// // }

// // async function handleRateLimit(response: Response): Promise<number> {
// //   const retryAfter = response.headers.get('retry-after');
// //   const rateLimitReset = response.headers.get('x-ratelimit-reset');

// //   let waitMs: number;

// //   if (retryAfter) {
// //     waitMs = parseInt(retryAfter, 10) * 1000;
// //   } else if (rateLimitReset) {
// //     const resetTime = parseInt(rateLimitReset, 10) * 1000;
// //     waitMs = Math.max(resetTime - Date.now(), 1000);
// //   } else {
// //     waitMs = 60_000; // Default: wait 60 seconds
// //   }

// //   // Cap the wait to a reasonable maximum of 120 seconds
// //   waitMs = Math.min(waitMs, 120_000);

// //   console.warn(
// //     `[github] Rate limit hit (HTTP ${response.status}). Waiting ${Math.ceil(waitMs / 1000)}s before retry.`
// //   );

// //   await new Promise((resolve) => setTimeout(resolve, waitMs));
// //   return waitMs;
// // }

// // async function fetchWithRetry(
// //   url: string,
// //   options: RequestInit = {},
// //   retries: number = 1
// // ): Promise<Response> {
// //   const mergedOptions: RequestInit = {
// //     ...options,
// //     headers: { ...DEFAULT_HEADERS, ...(options.headers as Record<string, string>) },
// //     signal: options.signal ?? createAbortSignal(),
// //   };

// //   let lastError: unknown;

// //   for (let attempt = 0; attempt <= retries; attempt++) {
// //     try {
// //       const response = await fetch(url, mergedOptions);

// //       // Handle rate limiting (403 or 429)
// //       if ((response.status === 403 || response.status === 429) && attempt < retries) {
// //         await handleRateLimit(response);
// //         // Create a fresh abort signal for retry
// //         mergedOptions.signal = createAbortSignal();
// //         continue;
// //       }

// //       return response;
// //     } catch (error: unknown) {
// //       lastError = error;

// //       if (error instanceof DOMException && error.name === 'AbortError') {
// //         if (attempt < retries) {
// //           console.warn(`[github] Request to ${url} timed out. Retrying...`);
// //           mergedOptions.signal = createAbortSignal();
// //           continue;
// //         }
// //         throw new Error(`[github] Request to ${url} timed out after ${DEFAULT_TIMEOUT}ms`);
// //       }

// //       if (attempt < retries) {
// //         console.warn(`[github] Network error fetching ${url}. Retrying...`);
// //         mergedOptions.signal = createAbortSignal();
// //         continue;
// //       }
// //     }
// //   }

// //   throw lastError ?? new Error(`[github] Failed to fetch ${url}`);
// // }

// // // ---------------------------------------------------------------------------
// // // Exported Functions
// // // ---------------------------------------------------------------------------

// // /**
// //  * Extracts the owner and repo name from a GitHub URL.
// //  *
// //  * Supported formats:
// //  *   - github.com/owner/repo
// //  *   - https://github.com/owner/repo
// //  *   - https://github.com/owner/repo/
// //  *   - https://github.com/owner/repo/tree/main/...
// //  */
// // export function extractRepoInfo(url: string): { owner: string; repo: string } {
// //   const cleaned = url.trim().replace(/\/$/, '');

// //   // Normalize: if no protocol, prepend https://
// //   const normalized = cleaned.startsWith('http')
// //     ? cleaned
// //     : `https://${cleaned}`;

// //   let pathname: string;
// //   try {
// //     const parsed = new URL(normalized);
// //     if (parsed.hostname !== 'github.com') {
// //       throw new Error(
// //         `[github] Invalid GitHub URL: expected host "github.com" but got "${parsed.hostname}"`
// //       );
// //     }
// //     pathname = parsed.pathname;
// //   } catch (e: unknown) {
// //     if (e instanceof Error && e.message.startsWith('[github]')) {
// //       throw e;
// //     }
// //     throw new Error(
// //       `[github] Invalid GitHub URL: unable to parse "${url}". Expected format: https://github.com/owner/repo`
// //     );
// //   }

// //   // Remove leading slash and split
// //   const segments = pathname.replace(/^\//, '').replace(/\/$/, '').split('/');

// //   if (segments.length < 2 || !segments[0] || !segments[1]) {
// //     throw new Error(
// //       `[github] Invalid GitHub URL: could not extract owner and repo from "${url}". Expected format: https://github.com/owner/repo`
// //     );
// //   }

// //   // Remove .git suffix if present
// //   const repo = segments[1].replace(/\.git$/, '');

// //   return { owner: segments[0], repo };
// // }

// // /**
// //  * Fetches the contents of a directory in a GitHub repository.
// //  * Handles pagination (up to 3 pages) and rate limit retry.
// //  */
// // export async function fetchRepoContents(
// //   owner: string,
// //   repo: string,
// //   path: string = ''
// // ): Promise<any[]> {
// //   const results: any[] = [];
// //   let url: string | null =
// //     `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
// //   let page = 0;

// //   while (url && page < MAX_PAGINATION_PAGES) {
// //     const response = await fetchWithRetry(url);

// //     if (!response.ok) {
// //       throw new Error(
// //         `[github] Failed to fetch repo contents (HTTP ${response.status}): ${owner}/${repo}/${path}`
// //       );
// //     }

// //     const data = await response.json();

// //     // The contents endpoint may return an object (file) or array (directory)
// //     const items: any[] = Array.isArray(data) ? data : [data];

// //     for (const item of items) {
// //       results.push({
// //         name: item.name,
// //         path: item.path,
// //         type: item.type,
// //         download_url: item.download_url,
// //         size: item.size,
// //         sha: item.sha,
// //       });
// //     }

// //     // Check for next page in Link header
// //     const linkHeader = response.headers.get('link');
// //     const links = parseLinkHeader(linkHeader);
// //     url = links['next'] ?? null;
// //     page++;
// //   }

// //   return results;
// // }

// // /**
// //  * Fetches the raw text content of a file given its download URL.
// //  * Includes 30s timeout and one retry on network error.
// //  */
// // export async function fetchFileContent(url: string): Promise<string> {
// //   const response = await fetchWithRetry(url, {}, 1);

// //   if (!response.ok) {
// //     throw new Error(
// //       `[github] Failed to fetch file content (HTTP ${response.status}): ${url}`
// //     );
// //   }

// //   return response.text();
// // }

// // /**
// //  * Determines if a filename represents a code file based on its extension.
// //  * Uses a Set for O(1) lookup performance.
// //  */
// // export function isCodeFile(filename: string): boolean {
// //   const lastDotIndex = filename.lastIndexOf('.');
// //   if (lastDotIndex === -1) return false;

// //   const extension = filename.slice(lastDotIndex).toLowerCase();
// //   return CODE_EXTENSIONS.has(extension);
// // }

// // /**
// //  * Fetches the README content for a repository.
// //  * Returns null if no README exists (404).
// //  * Decodes base64 content using atob().
// //  */
// // export async function getReadme(
// //   owner: string,
// //   repo: string
// // ): Promise<string | null> {
// //   const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;

// //   const response = await fetchWithRetry(url);

// //   if (response.status === 404) {
// //     return null;
// //   }

// //   if (!response.ok) {
// //     throw new Error(
// //       `[github] Failed to fetch README (HTTP ${response.status}): ${owner}/${repo}`
// //     );
// //   }

// //   const data = await response.json();

// //   if (!data.content) {
// //     return null;
// //   }

// //   // GitHub returns base64-encoded content with possible newlines
// //   const base64Clean = data.content.replace(/\n/g, '');
// //   const decoded = atob(base64Clean);

// //   // Handle UTF-8 multi-byte characters
// //   const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
// //   const text = new TextDecoder().decode(bytes);

// //   return text;
// // }

// // /**
// //  * Fetches the commit history for a repository.
// //  * Returns up to `limit` commits (default 30).
// //  */
// // export async function getCommitHistory(
// //   owner: string,
// //   repo: string,
// //   limit: number = DEFAULT_COMMIT_LIMIT
// // ): Promise<Commit[]> {
// //   const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=${limit}`;

// //   const response = await fetchWithRetry(url);

// //   if (!response.ok) {
// //     throw new Error(
// //       `[github] Failed to fetch commit history (HTTP ${response.status}): ${owner}/${repo}`
// //     );
// //   }

// //   const data: any[] = await response.json();

// //   return data.map((item) => ({
// //     sha: item.sha,
// //     message: item.commit?.message ?? '',
// //     date: item.commit?.author?.date ?? item.commit?.committer?.date ?? '',
// //     author: item.commit?.author?.name ?? item.author?.login ?? 'Unknown',
// //     url: item.html_url ?? '',
// //   }));
// // }
// /**
//  * GitHub API operations for fetching repository data
//  */

// interface RepoInfo {
//   owner: string;
//   repo: string;
// }

// interface GitHubFile {
//   name: string;
//   path: string;
//   type: 'file' | 'dir';
//   download_url: string | null;
//   size: number;
//   sha: string;
// }

// /**
//  * Build standard GitHub API headers, including auth if token exists
//  */
// function getHeaders(): HeadersInit {
//   const headers: HeadersInit = {
//     Accept: 'application/vnd.github.v3+json',
//     'User-Agent': 'CodeWalk-App',
//   };
//   if (process.env.GITHUB_TOKEN) {
//     headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
//   }
//   return headers;
// }

// /**
//  * Parse a GitHub URL into owner and repo segments
//  * @param url Full GitHub repository URL
//  * @returns RepoInfo with owner and repo
//  * @throws Error if URL invalid
//  */
// export function extractRepoInfo(url: string): RepoInfo {
//   if (!url || typeof url !== 'string') {
//     throw new Error('GitHub URL is required');
//   }

//   const cleaned = url.trim().replace(/\/+$/, '').replace(/\.git$/, '');
//   const pattern = /^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s]+)/i;
//   const match = cleaned.match(pattern);

//   if (!match) {
//     throw new Error('Invalid GitHub URL. Expected: https://github.com/owner/repo');
//   }

//   return { owner: match[1], repo: match[2] };
// }

// /**
//  * Fetch repository contents from GitHub API with pagination (max 3 pages)
//  * @param owner Repository owner
//  * @param repo Repository name
//  * @param path Optional subdirectory path
//  */
// export async function fetchRepoContents(
//   owner: string,
//   repo: string,
//   path: string = ''
// ): Promise<GitHubFile[]> {
//   const allFiles: GitHubFile[] = [];
//   let url: string | null = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?per_page=100`;
//   let pageCount = 0;
//   const MAX_PAGES = 3;

//   while (url && pageCount < MAX_PAGES) {
//     const response: Response = await fetch(url, { headers: getHeaders() });

//     if (!response.ok) {
//       if (response.status === 404) {
//         throw new Error(`Repository not found: ${owner}/${repo}`);
//       }
//       if (response.status === 403) {
//         throw new Error('GitHub API rate limit exceeded. Add GITHUB_TOKEN to .env.local');
//       }
//       throw new Error(`GitHub API error: ${response.status}`);
//     }

//     const data = await response.json();
//     const files: GitHubFile[] = (Array.isArray(data) ? data : [data]).map((item: any) => ({
//       name: item.name,
//       path: item.path,
//       type: item.type,
//       download_url: item.download_url,
//       size: item.size || 0,
//       sha: item.sha,
//     }));
//     allFiles.push(...files);

//     // Parse Link header for pagination
//     const linkHeader = response.headers.get('Link');
//     url = null;
//     if (linkHeader) {
//       const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
//       if (nextMatch) url = nextMatch[1];
//     }
//     pageCount++;
//   }

//   return allFiles;
// }

// /**
//  * Fetch raw file content with timeout and one retry on network failure
//  * @param url Raw download URL
//  */
// export async function fetchFileContent(url: string): Promise<string> {
//   const attempt = async (): Promise<string> => {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 30000);
//     try {
//       const response = await fetch(url, { signal: controller.signal });
//       clearTimeout(timeoutId);
//       if (!response.ok) {
//         throw new Error(`Failed to fetch file: ${response.status}`);
//       }
//       return await response.text();
//     } finally {
//       clearTimeout(timeoutId);
//     }
//   };

//   try {
//     return await attempt();
//   } catch (err: any) {
//     // Retry once on network errors
//     if (err.name === 'AbortError' || err.code === 'ECONNRESET' || err.message?.includes('fetch')) {
//       try {
//         return await attempt();
//       } catch (retryErr: any) {
//         throw new Error(`File fetch failed after retry: ${retryErr.message}`);
//       }
//     }
//     throw err;
//   }
// }

// /**
//  * Determine if a file is source code based on extension
//  */
// export function isCodeFile(filename: string): boolean {
//   const codeExtensions = [
//     '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
//     '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
//     '.scala', '.cs', '.vue', '.svelte',
//   ];
//   const lower = filename.toLowerCase();
//   return codeExtensions.some((ext) => lower.endsWith(ext));
// }

// /**
//  * Fetch and decode README content from a repository
//  * @returns README text or null if not found
//  */
// export async function getReadme(owner: string, repo: string): Promise<string | null> {
//   try {
//     const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
//     const response = await fetch(url, { headers: getHeaders() });
//     if (!response.ok) return null;
//     const data = await response.json();
//     if (!data.content) return null;
//     // Decode base64 (works in both Node and browser)
//     if (typeof atob !== 'undefined') {
//       return atob(data.content.replace(/\n/g, ''));
//     }
//     return Buffer.from(data.content, 'base64').toString('utf-8');
//   } catch {
//     return null;
//   }
// }
/**
 * GitHub API integration module for CodeWalk
 * Handles repository content fetching, file analysis, and README extraction
 */

interface RepoInfo {
  owner: string;
  repo: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
  size: number;
}

const GITHUB_API_BASE = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build GitHub API headers with optional auth token
 */
function buildHeaders(customToken?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = customToken || process.env.GITHUB_TOKEN;
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempt: number = 0
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok && response.status >= 500 && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 1000);
      return fetchWithRetry(url, init, attempt + 1);
    }

    return response;
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 1000);
      return fetchWithRetry(url, init, attempt + 1);
    }
    throw err;
  }
}

/**
 * Extract owner and repo name from a GitHub URL.
 * Supports formats: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 * @throws Error if URL is invalid
 */
export function extractRepoInfo(url: string): RepoInfo {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid GitHub URL: URL must be a non-empty string');
  }

  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');

  // Patterns to try
  const patterns = [
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i,
    /^github\.com\/([^/]+)\/([^/?#]+)/i,
    /^([^/\s]+)\/([^/\s?#]+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  throw new Error(
    'Invalid GitHub URL format. Expected: https://github.com/owner/repo'
  );
}

/**
 * Parse Link header from GitHub API for pagination
 */
function parseLinkHeader(header: string | null): { next?: string } {
  if (!header) return {};
  const links: Record<string, string> = {};
  const parts = header.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  }
  return { next: links.next };
}

/**
 * Fetch repository contents at a given path with pagination support.
 */
export async function fetchRepoContents(
  owner: string,
  repo: string,
  path: string = '',
  branch?: string,
  token?: string
): Promise<GitHubFile[]> {
  let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  if (branch) {
    url += `?ref=${encodeURIComponent(branch)}`;
  }
  const allItems: GitHubFile[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    // Append branch ref to paginated URLs if not already present
    let finalUrl = nextUrl;
    if (branch && !finalUrl.includes('ref=')) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + `ref=${encodeURIComponent(branch)}`;
    }

    const response: Response = await fetchWithRetry(finalUrl, {
      headers: buildHeaders(token),
    });

    if (response.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Add GITHUB_TOKEN to .env.local');
    }
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items: GitHubFile[] = Array.isArray(data) ? data : [data];

    for (const item of items) {
      allItems.push({
        name: item.name,
        path: item.path,
        type: item.type,
        download_url: item.download_url,
        size: item.size || 0,
      });
    }

    const linkHeader = response.headers.get('Link');
    nextUrl = parseLinkHeader(linkHeader).next;
  }

  return allItems;
}

/**
 * Fetch raw file content from a download URL.
 */
export async function fetchFileContent(url: string, token?: string): Promise<string> {
  if (!url) {
    throw new Error('Download URL is required');
  }

  try {
    const response = await fetchWithRetry(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    return await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Network error fetching file: ${message}`);
  }
}

/**
 * Determine if a filename represents a source code file.
 */
export function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs',
    '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
    '.scala', '.cs', '.vue', '.svelte',
  ];
  const lower = filename.toLowerCase();
  return codeExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * Fetch and decode the README of a repository.
 * @returns README text, or null if not found
 */
export async function getReadme(
  owner: string,
  repo: string,
  branch?: string,
  token?: string
): Promise<string | null> {
  try {
    let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
    if (branch) {
      url += `?ref=${encodeURIComponent(branch)}`;
    }
    const response = await fetchWithRetry(url, { headers: buildHeaders(token) });

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data = await response.json();
    if (data.content && data.encoding === 'base64') {
      // Strip newlines that GitHub adds
      const cleaned = data.content.replace(/\n/g, '');
      try {
        return atob(cleaned);
      } catch {
        return Buffer.from(cleaned, 'base64').toString('utf-8');
      }
    }
    return null;
  } catch {
    return null;
  }
}
