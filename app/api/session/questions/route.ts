import { NextResponse } from 'next/server';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile } from '@/app/lib/github';
import Groq from 'groq-sdk';

async function collectCodeFiles(
  owner: string,
  repo: string,
  token?: string
): Promise<Array<{ name: string; path: string; download_url: string | null; size: number }>> {
  const root = await fetchRepoContents(owner, repo, '', undefined, token);
  const collected: Array<{ name: string; path: string; download_url: string | null; size: number }> = [];

  for (const item of root) {
    if (item.type === 'file' && isCodeFile(item.name)) {
      collected.push(item);
    } else if (item.type === 'dir') {
      const skip = ['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static'];
      if (skip.includes(item.name)) continue;
      try {
        const sub = await fetchRepoContents(owner, repo, item.path, undefined, token);
        for (const s of sub) {
          if (s.type === 'file' && isCodeFile(s.name)) {
            collected.push(s);
          }
        }
      } catch {
        // ignore sub dir failures
      }
    }
  }
  return collected;
}

export async function POST(req: Request) {
  try {
    const { repoUrl, difficulty, focus } = await req.json();
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    const { owner, repo } = extractRepoInfo(repoUrl);
    const token = process.env.GITHUB_TOKEN;

    // 1. Collect files
    const allCodeFiles = await collectCodeFiles(owner, repo, token);
    if (allCodeFiles.length === 0) {
      return NextResponse.json({ error: 'No code files found in repository to generate questions from.' }, { status: 400 });
    }

    // 2. Select files matching focus
    const focusList: string[] = Array.isArray(focus) ? focus : [focus || 'All'];
    const isAll = focusList.includes('All');

    let selectedFiles = allCodeFiles.filter(file => {
      if (isAll) return true;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      const isFrontend = ['tsx', 'jsx', 'ts', 'js', 'html', 'css'].includes(ext);
      const isBackend = ['py', 'go', 'rs', 'java', 'cs', 'cpp', 'c', 'rb', 'php'].includes(ext);
      
      if (focusList.includes('Frontend') && isFrontend) return true;
      if (focusList.includes('Backend') && isBackend) return true;
      if (focusList.includes('DSA') && (isBackend || isFrontend)) return true;
      if (focusList.includes('System Design')) return true;

      return false;
    });

    if (selectedFiles.length === 0) {
      selectedFiles = allCodeFiles; // fallback
    }

    // Pick top 3 files (limit size to fit in LLM context)
    const pickedFiles = selectedFiles.slice(0, 3);
    const fileContentsPromises = pickedFiles.map(async (file) => {
      if (!file.download_url) return null;
      try {
        const content = await fetchFileContent(file.download_url, token);
        return {
          path: file.path,
          content: content.slice(0, 2000) // snippet limit
        };
      } catch {
        return null;
      }
    });

    const fileContents = (await Promise.all(fileContentsPromises)).filter(Boolean);

    // Prepare Groq client
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a senior technical interviewer. Analyze the provided codebase file snippets and generate 10 to 12 relevant interview questions.
For each question, extract a specific code snippet from the file, and specify its lines.
Your output must be a valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "Detailed question text targeting candidates understanding of the code, optimization, or architecture.",
      "code_snippet": "Actual code snippet referenced from the file.",
      "file_path": "File path where code is located.",
      "line_start": 10,
      "line_end": 20,
      "difficulty": "easy" | "medium" | "hard",
      "category": "frontend" | "backend" | "dsa" | "system-design",
      "follow_up_questions": ["follow-up 1", "follow-up 2"]
    }
  ]
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Ensure difficulty is strictly: easy, medium, or hard. Category must be strictly: frontend, backend, dsa, or system-design.`;

    const userPrompt = `Target Difficulty: ${difficulty || 'medium'}
Target Focus Areas: ${focusList.join(', ')}

Codebase Snippets:
${fileContents.map(f => `--- FILE: ${f?.path} ---\n${f?.content}`).join('\n\n')}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{"questions":[]}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Session questions API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
