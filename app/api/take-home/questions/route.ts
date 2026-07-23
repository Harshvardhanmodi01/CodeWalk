import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { extractRepoInfo, fetchGitHub, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from '@/app/lib/github';
import Groq from 'groq-sdk';
import { getNextToken } from '@/app/lib/github-token-pool';

// Helper to collect top files for interview context
async function collectFilesForInterview(
  owner: string,
  repo: string,
  token?: string
): Promise<string> {
  try {
    const files = await fetchRepoContents(owner, repo, '', undefined, token);
    const codeFiles = files.filter(f => f.type === 'file' && isCodeFile(f.name)).slice(0, 3);
    
    let result = '';
    for (const f of codeFiles) {
      if (f.download_url) {
        try {
          const content = await fetchFileContent(f.download_url, token);
          result += `\n--- File: ${f.path} ---\n${content.slice(0, 800)}`;
        } catch {}
      }
    }
    return result;
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const recruiterId = authResult.id;
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 1. Fetch project details
    const { data: project, error: projErr } = await supabase
      .from('take_home_projects')
      .select(`
        *,
        candidates:candidate_id (
          name,
          email
        )
      `)
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { submission_repo_url, project_brief, overall_project_score } = project;
    if (!submission_repo_url) {
      return NextResponse.json({ error: 'Candidate has not submitted a repository yet.' }, { status: 400 });
    }

    let owner = '', repo = '';
    try {
      const info = extractRepoInfo(submission_repo_url);
      owner = info.owner;
      repo = info.repo;
    } catch {
      return NextResponse.json({ error: 'Invalid submission repository URL' }, { status: 400 });
    }

    // 2. Fetch repo context for questions
    const githubToken = getNextToken() ?? undefined;
    const readme = await getReadme(owner, repo, undefined, githubToken);
    const codeContext = await collectFilesForInterview(owner, repo, githubToken);

    // 3. Generate questions using Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    let brief: any = {};
    try {
      brief = typeof project_brief === 'string' ? JSON.parse(project_brief) : project_brief || {};
    } catch {
      brief = {};
    }

    const systemPrompt = `You are an expert interviewer conducting a technical deep-dive into a candidate's take-home project submission. You must generate exactly 5 detailed, highly code-specific, and analytical interview questions. Return ONLY a valid JSON object matching the requested schema without markdown backticks.`;

    const userPrompt = `
    Candidate: ${project.candidates?.name || 'Applicant'}
    Project Assigned: ${project.project_title}
    
    Project Brief Requirements:
    Problem Statement: ${brief.problem_statement || project.project_description}
    Core Requirements:
    ${(brief.core_requirements || []).map((r: string) => `- ${r}`).join('\n')}
    Unique Twist: ${brief.unique_twist || ''}

    Candidate's Submitted Code context:
    README:
    ${(readme || '').slice(0, 1500)}

    Source Files Code:
    ${codeContext.slice(0, 4000)}

    Generate exactly 5 questions that probe:
    1. Why they made specific technical/architectural choices in their codebase.
    2. Any requirements gaps (e.g. they missed/altered a specific brief requirement).
    3. How they would refactor/improve a specific block of code.
    4. Explaining the logic of their most complex function.
    5. How they would scale this system to 1 million users.

    Return in this JSON format:
    {
      "questions": [
        {
          "question": "Question text (must be specific, e.g. Referencing their classes/files if possible)",
          "snippet": "Optional code snippet context from their files (5-10 lines of code showing what is being discussed)",
          "fileName": "Specific file path containing the code, or 'README.md'",
          "difficulty": "easy" | "medium" | "hard",
          "category": "frontend" | "backend" | "system-design" | "dsa",
          "answer": "Ideal expected answer (2-3 sentences)",
          "why_asked": "Reason for asking this question"
        }
      ]
    }`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const resContent = completion.choices?.[0]?.message?.content;
    if (!resContent) {
      throw new Error('Groq returned empty question content.');
    }

    const parsedData = JSON.parse(resContent);
    const questionsList = parsedData.questions || [];

    if (questionsList.length === 0) {
      throw new Error('Failed to parse generated interview questions.');
    }

    // 4. Create new interview session in 'sessions' table
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .insert({
        recruiter_id: recruiterId,
        candidate_id: project.candidate_id,
        repo_url: submission_repo_url,
        status: 'active',
        timer_duration_minutes: 60,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessErr || !session) {
      console.error('Failed to create session:', sessErr);
      return NextResponse.json({ error: 'Failed to initialize interview session.' }, { status: 500 });
    }

    // 5. Insert questions linked to session
    const questionsToInsert = questionsList.slice(0, 5).map((q: any, idx: number) => ({
      session_id: session.id,
      question_text: q.question || 'Explain your technical implementation choices.',
      code_snippet: q.snippet || '',
      file_path: q.fileName || 'source_code',
      difficulty: q.difficulty || 'medium',
      category: q.category || 'backend',
      order_index: idx,
      expected_answer: q.answer || '',
      question_type: 'code-based',
      why_asked: q.why_asked || 'Verify technical comprehension'
    }));

    const { error: questErr } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questErr) {
      console.error('Failed to save interview questions:', questErr);
      return NextResponse.json({ error: 'Failed to attach questions to interview session.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id
    });
  } catch (err: any) {
    console.error('Failed to generate project interview:', err);
    return NextResponse.json({ error: err.message || 'Questions generation failed.' }, { status: 500 });
  }
}
