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

import { requireAuth } from '@/app/lib/auth-middleware';
import { validateGithubUrl, validateDifficulty } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const repoUrl = body.github_url || body.repoUrl;
    const difficulty = body.difficulty || 'medium';
    const focus = body.focus || ['All'];
    const jobDescription = body.job_description || body.jobDescription;
    const count = body.count || 12;

    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return NextResponse.json({ error: 'Valid repository URL is required' }, { status: 400 });
    }

    if (difficulty && !validateDifficulty(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty value' }, { status: 400 });
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

    // Pick top 4 files for analysis and extract full contents
    const pickedFiles = selectedFiles.slice(0, 4);
    const fileContentsMap = new Map<string, string>();

    const fileContentsPromises = pickedFiles.map(async (file) => {
      if (!file.download_url) return null;
      try {
        const content = await fetchFileContent(file.download_url, token);
        fileContentsMap.set(file.path, content);
        return {
          path: file.path,
          content: content.slice(0, 3500)
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

    const hasJD = !!(jobDescription && jobDescription.trim());

    let systemPrompt = '';
    let userPrompt = '';

    if (hasJD) {
      systemPrompt = `You are a senior technical interviewer. You have two inputs:
1. Candidate's actual code from their GitHub repository
2. Job description for the role they are applying for

Generate ${count} interview questions total split into these categories:
- Directly about the candidate's actual code (reference specific functions, files, or patterns you see in their code) [question_type: code-based]
- Connect their code experience to the job requirements (e.g. if JD requires microservices and their code shows REST APIs, ask about scaling their approach) [question_type: jd-connected]
- Technologies mentioned in JD that are NOT in their code (to assess learning ability and gaps) [question_type: skill-gap]
- System design or architectural questions relevant to the job role [question_type: system-design]

CRITICAL: The "file_path" field MUST match exactly one of the file paths provided in the codebase snippets for code-based and jd-connected questions. Do NOT invent new files or file paths.
CRITICAL: The "code_snippet" field MUST contain the actual code segment from the file that is the subject of the question (e.g. if asking about class NetworkDataExtract, include that class definition). Do not include unrelated imports or code. The "line_start" and "line_end" MUST be the exact line numbers in the file where that snippet resides.
For skill-gap and system-design questions, file_path can be empty or "Custom Question", and code_snippet should be empty.

Your output must be a valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "Detailed question text targeting candidate's understanding of the code, optimization, or architecture.",
      "code_snippet": "Actual code snippet referenced from the file.",
      "file_path": "File path where code is located.",
      "line_start": 10,
      "line_end": 20,
      "difficulty": "easy" | "medium" | "hard",
      "category": "frontend" | "backend" | "dsa" | "system-design" | "behavioral",
      "question_type": "code-based" | "jd-connected" | "skill-gap" | "system-design",
      "why_asked": "One sentence explaining why this question is relevant to the role.",
      "expected_answer": {
        "ideal_explanation": "how a strong candidate should explain this code",
        "key_concepts": ["technical term 1", "technical term 2"],
        "correct_approach": "what the right technical answer or reasoning is",
        "follow_up_if_struggle": "one suggested follow-up question to help candidate think deeper",
        "red_flags": ["sign of a weak technical answer 1", "sign of a weak technical answer 2"]
      },
      "follow_up_questions": ["follow-up 1", "follow-up 2"]
    }
  ]
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Category must be strictly: frontend, backend, dsa, system-design, or behavioral. Difficulty must be strictly: easy, medium, or hard.`;

      userPrompt = `Target Difficulty: ${difficulty || 'medium'}
   Target Focus Areas: ${focusList.join(', ')}
   
   Job Description:
   ${jobDescription.trim()}
   
   Codebase Snippets:
   ${fileContents.map(f => `--- FILE: ${f?.path} ---\n${f?.content}`).join('\n\n')}`;
   
       } else {
         systemPrompt = `You are a senior technical interviewer. Analyze the provided codebase file snippets and generate ${count} relevant interview questions.
    For each question, extract a specific code snippet from the file, and specify its lines.
    CRITICAL: The "file_path" field MUST match exactly one of the file paths provided in the codebase snippets. Do NOT invent new files or file paths.
    CRITICAL: The "code_snippet" field MUST contain the actual code segment from the file that is the subject of the question (e.g. if asking about class NetworkDataExtract, include that class definition). Do not include unrelated imports or code. The "line_start" and "line_end" MUST be the exact line numbers in the file where that snippet resides.
   
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
         "question_type": "code-based",
         "why_asked": "One sentence explaining why this question is relevant to their code.",
         "expected_answer": {
           "ideal_explanation": "how a strong candidate should explain this code",
           "key_concepts": ["technical term 1", "technical term 2"],
           "correct_approach": "what the right technical answer or reasoning is",
           "follow_up_if_struggle": "one suggested follow-up question to help candidate think deeper",
           "red_flags": ["sign of a weak technical answer 1", "sign of a weak technical answer 2"]
         },
         "follow_up_questions": ["follow-up 1", "follow-up 2"]
       }
     ]
   }
   Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Category must be strictly: frontend, backend, dsa, or system-design. Difficulty must be strictly: easy, medium, or hard.`;
   
         userPrompt = `Target Difficulty: ${difficulty || 'medium'}
   Target Focus Areas: ${focusList.join(', ')}
   
   Codebase Snippets:
   ${fileContents.map(f => `--- FILE: ${f?.path} ---\n${f?.content}`).join('\n\n')}`;
       }

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

    const rawQuestions = parsed.questions || [];
    const validQuestions: any[] = [];

    function findMatchingFileKey(filePath: string, mapKeys: string[]): string | undefined {
      if (!filePath) return undefined;
      const cleanPath = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
      if (mapKeys.includes(cleanPath)) return cleanPath;
      if (mapKeys.includes(filePath)) return filePath;
      for (const key of mapKeys) {
        const cleanKey = key.replace(/^\/+/, '');
        if (cleanKey.endsWith(cleanPath) || cleanPath.endsWith(cleanKey)) {
          return key;
        }
      }
      return undefined;
    }

    function findSnippetLines(fullContent: string, snippet: string): { start: number; end: number } | null {
      if (!snippet || !snippet.trim()) return null;
      let index = fullContent.indexOf(snippet);
      if (index === -1) {
        const snippetLines = snippet.split('\n').map(l => l.trim()).filter(Boolean);
        if (snippetLines.length > 0) {
          const firstLine = snippetLines[0];
          let searchStart = 0;
          while (true) {
            const pos = fullContent.indexOf(firstLine, searchStart);
            if (pos === -1) break;
            const linesFromPos = fullContent.slice(pos).split('\n');
            let matchCount = 0;
            for (let i = 0; i < Math.min(snippetLines.length, linesFromPos.length); i++) {
              if (linesFromPos[i].trim().includes(snippetLines[i])) {
                matchCount++;
              }
            }
            if (matchCount >= Math.min(3, snippetLines.length)) {
              index = pos;
              break;
            }
            searchStart = pos + 1;
          }
        }
      }
      if (index !== -1) {
        const linesBefore = fullContent.slice(0, index).split('\n');
        const startLine = linesBefore.length;
        const snippetLineCount = snippet.split('\n').length;
        const endLine = startLine + snippetLineCount - 1;
        return { start: startLine, end: endLine };
      }
      return null;
    }

    function selfHealSnippet(questionText: string, fullContent: string): { start: number; end: number; snippet: string } | null {
      const classRegex = /\b([A-Z][a-zA-Z0-9_]+)\b\s+(?:class)/i;
      const classRegex2 = /(?:class)\s+\b([A-Z][a-zA-Z0-9_]+)\b/i;
      const methodRegex = /\b([a-z_][a-z0-9_]+)\b\s+(?:method|function|procedure|decorator)/i;
      const methodRegex2 = /(?:method|function|procedure|decorator)\s+\b([a-z_][a-z0-9_]+)\b/i;

      let targetName = '';
      let isClass = false;
      let isMethod = false;

      let match = questionText.match(classRegex) || questionText.match(classRegex2);
      if (match) {
        targetName = match[1];
        isClass = true;
      } else {
        match = questionText.match(methodRegex) || questionText.match(methodRegex2);
        if (match) {
          targetName = match[1];
          isMethod = true;
        }
      }

      if (!targetName) {
        const words = questionText.replace(/[^a-zA-Z0-9_ ]/g, '').split(' ');
        for (const word of words) {
          if (word.includes('_') && word.length > 3) {
            targetName = word;
            isMethod = true;
            break;
          }
          if (/^[A-Z][a-zA-Z0-9]+$/.test(word) && word.length > 4 && word !== 'Question' && word !== 'GitHub' && word !== 'MongoDB') {
            targetName = word;
            isClass = true;
            break;
          }
        }
      }

      if (targetName) {
        const lines = fullContent.split('\n');
        let foundIdx = -1;
        const searchPatterns = isClass 
          ? [new RegExp(`class\\s+${targetName}\\b`), new RegExp(`interface\\s+${targetName}\\b`), new RegExp(`struct\\s+${targetName}\\b`)]
          : [new RegExp(`def\\s+${targetName}\\b`), new RegExp(`function\\s+${targetName}\\b`), new RegExp(`${targetName}\\s*=\\s*\\(`), new RegExp(`\\b${targetName}\\b`)];

        for (const pattern of searchPatterns) {
          foundIdx = lines.findIndex(line => pattern.test(line));
          if (foundIdx !== -1) break;
        }

        if (foundIdx !== -1) {
          const start = foundIdx + 1;
          const end = Math.min(lines.length, start + 8);
          const snippet = lines.slice(start - 1, end).join('\n');
          return { start, end, snippet };
        }
      }
      return null;
    }

    for (const q of rawQuestions) {
      if (q.file_path && q.file_path !== 'Custom Question' && q.file_path.trim() !== '') {
        const matchedKey = findMatchingFileKey(q.file_path, Array.from(fileContentsMap.keys()));
        if (!matchedKey) continue;

        const fullContent = fileContentsMap.get(matchedKey)!;
        q.file_path = matchedKey;

        let healed = null;
        if (q.code_snippet && q.code_snippet.trim()) {
          const matchedLines = findSnippetLines(fullContent, q.code_snippet);
          if (matchedLines) {
            healed = {
              start: matchedLines.start,
              end: matchedLines.end,
              snippet: fullContent.split('\n').slice(matchedLines.start - 1, matchedLines.end).join('\n')
            };
          }
        }

        if (!healed) {
          healed = selfHealSnippet(q.question_text, fullContent);
        }

        const lines = fullContent.split('\n');
        let start = Math.max(1, parseInt(q.line_start) || 1);
        let end = Math.min(lines.length, parseInt(q.line_end) || start);

        if (healed) {
          q.code_snippet = healed.snippet;
          q.line_start = healed.start;
          q.line_end = healed.end;
        } else {
          if (start > lines.length || end < start) continue;
          const extractedLines = lines.slice(start - 1, end);
          const nonEmptyLines = extractedLines.filter(l => l.trim().length > 0);
          if (nonEmptyLines.length < 1) continue;

          q.code_snippet = extractedLines.join('\n');
          q.line_start = start;
          q.line_end = end;
        }
      } else {
        q.code_snippet = '';
        q.line_start = 0;
        q.line_end = 0;
      }
      validQuestions.push(q);
    }

    return NextResponse.json({ questions: validQuestions.slice(0, count) });

  } catch (err: any) {
    console.error('API technical questions error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
