import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { extractRepoInfo, fetchRepoContents, fetchFileContent, isCodeFile } from '@/app/lib/github';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

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
    const { candidateIds, positionId, recruiterId } = await req.json();

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json({ error: 'Candidate IDs array is required' }, { status: 400 });
    }
    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }
    if (!recruiterId) {
      return NextResponse.json({ error: 'Recruiter ID is required' }, { status: 400 });
    }

    // 1. Create a batch job in the database
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('batch_jobs')
      .insert({
        position_id: positionId,
        recruiter_id: recruiterId,
        status: 'processing',
        total_count: candidateIds.length,
        completed_count: 0,
        failed_count: 0
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    // 2. Start background worker queue
    processQueue(job.id, candidateIds, positionId, recruiterId);

    // 3. Return immediately
    return NextResponse.json({ data: { batchJobId: job.id } });
  } catch (err: any) {
    console.error('Bulk generate questions API trigger error:', err);
    return NextResponse.json({ error: err.message || 'Failed to start bulk generation.' }, { status: 500 });
  }
}

// Background Queue Processor
async function processQueue(batchJobId: string, candidateIds: string[], positionId: string, recruiterId: string) {
  let index = 0;

  const worker = async () => {
    while (index < candidateIds.length) {
      const currentIdx = index++;
      const candidateId = candidateIds[currentIdx];

      try {
        await processSingleCandidate(candidateId, positionId, recruiterId);
        
        // Increment completed count
        const { data: cJob } = await supabaseAdmin.from('batch_jobs').select('completed_count').eq('id', batchJobId).single();
        await supabaseAdmin
          .from('batch_jobs')
          .update({ completed_count: (cJob?.completed_count ?? 0) + 1 })
          .eq('id', batchJobId);
      } catch (err) {
        console.error(`Failed to process candidate ${candidateId}:`, err);
        // Increment failed count
        const { data: fJob } = await supabaseAdmin.from('batch_jobs').select('failed_count').eq('id', batchJobId).single();
        await supabaseAdmin
          .from('batch_jobs')
          .update({ failed_count: (fJob?.failed_count ?? 0) + 1 })
          .eq('id', batchJobId);
      }
    }
  };

  // Run up to 3 workers in parallel
  const workers = Array.from({ length: Math.min(3, candidateIds.length) }, () => worker());
  await Promise.all(workers);

  // Finalize batch job state
  const { data: job } = await supabaseAdmin
    .from('batch_jobs')
    .select('completed_count, failed_count, total_count')
    .eq('id', batchJobId)
    .single();

  const finalStatus = (job?.failed_count ?? 0) === (job?.total_count ?? 0) ? 'failed' : 'completed';
  
  await supabaseAdmin
    .from('batch_jobs')
    .update({
      status: finalStatus,
      completed_at: new Date().toISOString()
    })
    .eq('id', batchJobId);
}

// Individual candidate process engine
async function processSingleCandidate(candidateId: string, positionId: string, recruiterId: string) {
  // 1. Fetch Candidate Details
  const { data: candidate, error: candErr } = await supabaseAdmin
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candErr || !candidate) throw new Error('Candidate not found.');

  // 2. Fetch Position Details
  const { data: position, error: posErr } = await supabaseAdmin
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single();

  if (posErr || !position) throw new Error('Position not found.');

  // 3. Fetch GitHub codebase
  const { owner, repo } = extractRepoInfo(candidate.github_url);
  const token = process.env.GITHUB_TOKEN;

  const allCodeFiles = await collectCodeFiles(owner, repo, token);
  if (allCodeFiles.length === 0) {
    throw new Error('No code files found in repository.');
  }

  const pickedFiles = allCodeFiles.slice(0, 4);
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

  // 4. Call Groq Llama-3.3-70b-versatile
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');
  const groq = new Groq({ apiKey: groqKey });

  const systemPrompt = `You are a senior technical interviewer. You have two inputs:
1. Candidate's actual code from their GitHub repository
2. Job description for the role they are applying for

Generate 16 interview questions total split into these categories:
- 5 questions directly about the candidate's actual code (reference specific functions, files, or patterns you see in their code) [question_type: code-based]
- 5 questions that connect their code experience to the job requirements (e.g. if JD requires microservices and their code shows REST APIs, ask about scaling their approach) [question_type: jd-connected]
- 3 questions about technologies mentioned in JD that are NOT in their code (to assess learning ability and gaps) [question_type: skill-gap]
- 3 system design or architectural questions relevant to the job role [question_type: system-design]

Also, analyze the candidate's codebase to detect the technologies, libraries, and frameworks they are using.

Your output must be a valid JSON object matching this schema:
{
  "detected_tech_stack": ["React", "TypeScript", "Node.js", "Express", "PostgreSQL", "etc."],
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
      "expected_answer": "Concise key points of what a correct answer should include.",
      "follow_up_questions": ["follow-up 1", "follow-up 2"]
    }
  ]
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Category must be strictly: frontend, backend, dsa, system-design, or behavioral. Difficulty must be strictly: easy, medium, or hard.`;

  const userPrompt = `Target Difficulty: medium
Job Title: ${position.title}
Job Description:
${position.job_description}

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

  const resultText = completion.choices?.[0]?.message?.content || '{"detected_tech_stack":[],"questions":[]}';
  const parsed = JSON.parse(resultText);

  const detectedTechStack: string[] = parsed.detected_tech_stack || [];
  const rawQuestions = parsed.questions || [];
  const validQuestions: any[] = [];

  // Extract & validate code snippets
  for (const q of rawQuestions) {
    if (q.file_path && q.file_path !== 'Custom Question' && q.file_path.trim() !== '') {
      const fullContent = fileContentsMap.get(q.file_path);
      if (!fullContent) continue;

      const lines = fullContent.split('\n');
      const start = Math.max(1, parseInt(q.line_start) || 1);
      const end = Math.min(lines.length, parseInt(q.line_end) || start);

      if (start > lines.length || end < start) continue;

      const extractedLines = lines.slice(start - 1, end);
      const nonEmptyLines = extractedLines.filter(l => l.trim().length > 0);
      if (nonEmptyLines.length < 3) continue;

      q.code_snippet = extractedLines.join('\n');
    }
    validQuestions.push(q);
  }

  // Slice to exactly 12 questions matching distribution
  const finalQuestions = validQuestions.slice(0, 12);

  // 5. Create Session
  const { data: session, error: sessErr } = await supabaseAdmin
    .from('sessions')
    .insert({
      recruiter_id: recruiterId,
      candidate_id: candidateId,
      repo_url: candidate.github_url,
      status: 'active',
      timer_duration_minutes: 45,
      remaining_seconds: 2700
    })
    .select()
    .single();

  if (sessErr) throw sessErr;

  // 6. Pre-create Report
  await supabaseAdmin
    .from('session_reports')
    .insert({
      session_id: session.id,
      overall_score: 0,
      hire_recommendation: 'maybe',
      code_story_summary: '',
      total_questions: finalQuestions.length,
      completed_questions: 0
    });

  // 7. Save Questions linked to Session
  const formattedQs = finalQuestions.map((q, idx) => ({
    session_id: session.id,
    question_text: q.question_text,
    code_snippet: q.code_snippet || null,
    file_path: q.file_path || null,
    line_start: q.line_start || null,
    line_end: q.line_end || null,
    difficulty: q.difficulty || 'medium',
    category: q.category || 'backend',
    order_index: idx,
    expected_answer: q.expected_answer || null,
    question_type: q.question_type || 'code-based',
    why_asked: q.why_asked || null
  }));

  const { error: qsErr } = await supabaseAdmin.from('questions').insert(formattedQs);
  if (qsErr) throw qsErr;

  // 8. Calculate Smart Fit Score
  const required: string[] = position.required_skills || [];
  const candidateSkills = [
    ...(candidate.tech_stack || []),
    ...detectedTechStack
  ].map((s: string) => s.toLowerCase());

  const uniqueSkills = Array.from(new Set(candidateSkills));

  const matched: string[] = [];
  const missing: string[] = [];

  required.forEach((skill: string) => {
    if (uniqueSkills.some((s: string) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  const overlapPercent = required.length > 0 ? (matched.length / required.length) * 100 : 0;

  let fitScore = 'possible_fit';
  if (overlapPercent >= 70) {
    fitScore = 'best_fit';
  } else if (overlapPercent >= 40) {
    fitScore = 'good_fit';
  }

  // Update candidate record
  const { error: updateErr } = await supabaseAdmin
    .from('candidates')
    .update({
      fit_score: fitScore,
      matched_skills: { matched },
      missing_skills: { missing },
      tech_stack: Array.from(new Set([...(candidate.tech_stack || []), ...detectedTechStack]))
    })
    .eq('id', candidateId);

  if (updateErr) throw updateErr;

  // Update profiles tokens_used count
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tokens_used')
    .eq('id', recruiterId)
    .single();

  const nextUsed = (profile?.tokens_used ?? 0) + 1;
  await supabaseAdmin
    .from('profiles')
    .update({ tokens_used: nextUsed })
    .eq('id', recruiterId);
}
