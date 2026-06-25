import { NextResponse } from 'next/server';
import { extractRepoInfo, fetchFileContent, fetchGitHub } from '@/app/lib/github';

export async function POST(req: Request) {
  try {
    const { repoUrl, action, path } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    const { owner, repo } = extractRepoInfo(repoUrl);
    const token = process.env.GITHUB_TOKEN;

    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CodeWalk-App',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (action === 'tree') {
      // 1. Fetch repository metadata to find the default branch
      const repoRes = await fetchGitHub(`https://api.github.com/repos/${owner}/${repo}`, token);
      if (!repoRes.ok) {
        throw new Error(`Failed to fetch repo metadata: ${repoRes.statusText}`);
      }
      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || 'main';

      // 2. Fetch recursive git tree
      const treeRes = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        token
      );

      if (!treeRes.ok) {
        // Fallback: if recursive tree fails, return a basic list of top-level files
        return NextResponse.json({
          defaultBranch,
          tree: [
            { path: 'README.md', type: 'blob', size: 100 },
          ],
        });
      }

      const treeData = await treeRes.json();
      return NextResponse.json({
        defaultBranch,
        tree: treeData.tree || [],
      });
    }

    if (action === 'file') {
      if (!path) {
        return NextResponse.json({ error: 'File path is required' }, { status: 400 });
      }

      // Fetch file content.
      const fileRes = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        token
      );

      if (!fileRes.ok) {
        throw new Error(`Failed to fetch file content: ${fileRes.statusText}`);
      }

      const fileData = await fileRes.json();

      if (fileData.encoding === 'base64' && fileData.content) {
        const decoded = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
        return NextResponse.json({ content: decoded });
      }

      if (fileData.download_url) {
        const rawContent = await fetchFileContent(fileData.download_url, token);
        return NextResponse.json({ content: rawContent });
      }

      return NextResponse.json({ error: 'Could not fetch file content' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Session files API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
