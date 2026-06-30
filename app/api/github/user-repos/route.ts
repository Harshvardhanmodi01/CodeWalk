import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeWalk-App'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    const repos = data.map((r: any) => ({
      name: r.name,
      html_url: r.html_url,
      description: r.description || ''
    }));

    return NextResponse.json({ repos });
  } catch (err: any) {
    console.error('Failed to fetch github repos for username:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch repositories' }, { status: 500 });
  }
}
