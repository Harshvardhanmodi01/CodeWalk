import { NextResponse } from 'next/server';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile } from '@/app/lib/github';
import Groq from 'groq-sdk';
import { getNextToken } from '@/app/lib/github-token-pool';

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
    const { repoUrl, difficulty, focus, jobDescription } = await req.json();
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    const { owner, repo } = extractRepoInfo(repoUrl);
    const token = getNextToken() ?? undefined;

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
          content: content.slice(0, 3500) // send slightly larger content window to groq
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

Generate 16 interview questions total split into these categories:
- 5 questions directly about the candidate's actual code (reference specific functions, files, or patterns you see in their code) [question_type: code-based]
- 5 questions that connect their code experience to the job requirements (e.g. if JD requires microservices and their code shows REST APIs, ask about scaling their approach) [question_type: jd-connected]
- 3 questions about technologies mentioned in JD that are NOT in their code (to assess learning ability and gaps) [question_type: skill-gap]
- 3 system design or architectural questions relevant to the job role [question_type: system-design]

CRITICAL: The "file_path" field MUST match exactly one of the file paths provided in the codebase snippets for code-based and jd-connected questions. Do NOT invent new files or file paths.
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
         systemPrompt = `You are a senior technical interviewer. Analyze the provided codebase file snippets and generate 12 relevant interview questions.
   For each question, extract a specific code snippet from the file, and specify its lines.
   CRITICAL: The "file_path" field MUST match exactly one of the file paths provided in the codebase snippets. Do NOT invent new files or file paths.
   
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

    // 3. Post-Process & Re-extract Code Snippets from full file content
    const rawQuestions = parsed.questions || [];
    const validQuestions: any[] = [];

    for (const q of rawQuestions) {
      // If code snippet is associated with a file path, extract it from full content
      if (q.file_path && q.file_path !== 'Custom Question' && q.file_path.trim() !== '') {
        const fullContent = fileContentsMap.get(q.file_path);
        if (!fullContent) {
          // Skip if file not found in our fetched map
          continue;
        }

        const lines = fullContent.split('\n');
        const start = Math.max(1, parseInt(q.line_start) || 1);
        const end = Math.min(lines.length, parseInt(q.line_end) || start);

        if (start > lines.length || end < start) {
          // Skip if line range is invalid
          continue;
        }

        const extractedLines = lines.slice(start - 1, end);
        // Validate minimum 3 lines of actual non-empty/non-whitespace code
        const nonEmptyLines = extractedLines.filter(l => l.trim().length > 0);
        if (nonEmptyLines.length < 3) {
          // Skip if it contains less than 3 lines of actual code
          continue;
        }

        // Replace with actual extracted content
        q.code_snippet = extractedLines.join('\n');
        q.line_start = start;
        q.line_end = end;
      } else {
        // For skill-gap or system-design with no file_path, ensure code_snippet is empty
        q.code_snippet = '';
        q.line_start = 0;
        q.line_end = 0;
      }

      validQuestions.push(q);
    }

    // Filter by type if JD is provided to make sure we match the target distribution
    if (hasJD) {
      const codeBased = validQuestions.filter(q => q.question_type === 'code-based');
      const jdConnected = validQuestions.filter(q => q.question_type === 'jd-connected');
      const skillGap = validQuestions.filter(q => q.question_type === 'skill-gap');
      const systemDesign = validQuestions.filter(q => q.question_type === 'system-design');

      // Slice to match exactly: 4, 4, 2, 2
      const finalQuestions = [
        ...codeBased.slice(0, 4),
        ...jdConnected.slice(0, 4),
        ...skillGap.slice(0, 2),
        ...systemDesign.slice(0, 2)
      ];

      // If we fall short of 12 (due to failed validation), fill in with any remaining valid questions
      if (finalQuestions.length < 12) {
        const usedIds = new Set(finalQuestions.map(q => q.question_text));
        const remaining = validQuestions.filter(q => !usedIds.has(q.question_text));
        finalQuestions.push(...remaining.slice(0, 12 - finalQuestions.length));
      }

      return NextResponse.json({ questions: finalQuestions });
    } else {
      // Standard flow: slice to 10 or 12 questions
      return NextResponse.json({ questions: validQuestions.slice(0, 12) });
    }

  } catch (err: any) {
    console.error('Session questions API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
