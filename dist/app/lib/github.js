"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRepoInfo = extractRepoInfo;
exports.fetchRepoContents = fetchRepoContents;
exports.fetchFileContent = fetchFileContent;
exports.isCodeFile = isCodeFile;
exports.getReadme = getReadme;
const GITHUB_API_BASE = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
/**
 * Sleep helper for retry backoff
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Build GitHub API headers with optional auth token
 */
function buildHeaders(customToken) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CodeWalk-App',
    };
    const token = customToken || process.env.GITHUB_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}
/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(url, init, attempt = 0) {
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
    }
    catch (err) {
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
function extractRepoInfo(url) {
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
    throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repo');
}
/**
 * Parse Link header from GitHub API for pagination
 */
function parseLinkHeader(header) {
    if (!header)
        return {};
    const links = {};
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
async function fetchRepoContents(owner, repo, path = '', branch, token) {
    let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    if (branch) {
        url += `?ref=${encodeURIComponent(branch)}`;
    }
    const allItems = [];
    let nextUrl = url;
    while (nextUrl) {
        // Append branch ref to paginated URLs if not already present
        let finalUrl = nextUrl;
        if (branch && !finalUrl.includes('ref=')) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + `ref=${encodeURIComponent(branch)}`;
        }
        const response = await fetchWithRetry(finalUrl, {
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
        const items = Array.isArray(data) ? data : [data];
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
async function fetchFileContent(url, token) {
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Network error fetching file: ${message}`);
    }
}
/**
 * Determine if a filename represents a source code file.
 */
function isCodeFile(filename) {
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
async function getReadme(owner, repo, branch, token) {
    try {
        let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
        if (branch) {
            url += `?ref=${encodeURIComponent(branch)}`;
        }
        const response = await fetchWithRetry(url, { headers: buildHeaders(token) });
        if (response.status === 404)
            return null;
        if (!response.ok)
            return null;
        const data = await response.json();
        if (data.content && data.encoding === 'base64') {
            // Strip newlines that GitHub adds
            const cleaned = data.content.replace(/\n/g, '');
            return Buffer.from(cleaned, 'base64').toString('utf-8');
        }
        return null;
    }
    catch {
        return null;
    }
}
