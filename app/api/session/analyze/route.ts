import { NextResponse } from 'next/server';
import { extractRepoInfo, fetchRepoContents, fetchFileContent } from '@/app/lib/github';
import Groq from 'groq-sdk';
import { requireAuth } from '@/app/lib/auth-middleware';
import { validateGithubUrl } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { repoUrl } = await req.json().catch(() => ({}));
    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return NextResponse.json({ error: 'Valid repository URL is required' }, { status: 400 });
    }

    const { owner, repo } = extractRepoInfo(repoUrl);
    const token = process.env.GITHUB_TOKEN;

    // Fetch top-level contents
    let files: any[] = [];
    try {
      files = await fetchRepoContents(owner, repo, '', undefined, token);
    } catch (e: any) {
      console.error('Repo contents fetch failed:', e);
      return NextResponse.json({ error: 'Failed to fetch repository contents' }, { status: 400 });
    }

    // Try to fetch README
    let readmeText = '';
    const readmeFile = files.find(f => f.name.toLowerCase() === 'readme.md');
    if (readmeFile && readmeFile.download_url) {
      try {
        readmeText = await fetchFileContent(readmeFile.download_url, token);
      } catch (err) {
        console.warn('Failed to fetch README content:', err);
      }
    }

    // Compile file list for Groq context
    const fileList = files.map(f => `${f.type}: ${f.path} (${f.size} bytes)`).join('\n');

    // Call Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a senior technical screener. Analyze the repository file structure and README context, then return a valid JSON object matching this schema:
{
  "languages_used": ["Type1", "Type2"],
  "primary_language": "Language",
  "code_complexity": "low" | "medium" | "high",
  "commit_style": "consistent" | "irregular" | "last-minute",
  "project_type": "Web App" | "API" | "Library" | "CLI" | "Other",
  "notable_patterns": ["Pattern 1", "Pattern 2"],
  "potential_weaknesses": ["Weakness 1", "Weakness 2"],
  "overall_summary": "Overall repo architecture and size summary.",
  "candidate_brief": "Candidate capability brief (2-3 sentences based on what they built)."
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON.`;

    const userPrompt = `Repository Name: ${owner}/${repo}
Files in repository root:
${fileList}

README Content snippet:
${readmeText.slice(0, 3000)}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json({
      owner,
      repo,
      githubAvatarUrl: `https://github.com/${owner}.png`,
      analysis: parsed
    });
  } catch (err: any) {
    console.error('Session analyze API error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
