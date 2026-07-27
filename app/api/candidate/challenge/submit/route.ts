import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, submittedCode } = body;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required.' }, { status: 400 });
    }

    // 1. Retrieve session details and the generated challenge definition
    const { data: session, error: getErr } = await supabaseAdmin
      .from('sessions')
      .select('result')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const result = session.result || {};
    const challenge = result.challenge;

    if (!challenge) {
      // If no challenge is found, save fallback evaluation and complete session
      const updatedResult = {
        ...result,
        challenge_submission: {
          submittedCode: submittedCode || '',
          completedAt: new Date().toISOString()
        },
        challenge_evaluation: {
          score: 100,
          evaluationText: 'No repository micro-challenge was configured for this session.',
          codeStyleMatch: 'High'
        }
      };

      await supabaseAdmin
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          remaining_seconds: 0,
          result: updatedResult
        })
        .eq('id', sessionId);

      return NextResponse.json({ success: true });
    }

    // 2. Prepare evaluation using Groq API
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a senior tech lead reviewing a candidate's code submission for a repository micro-challenge.
Analyze the provided challenge description, the original repository file code, the reference solution, and the candidate's actual submission.

Your task is to evaluate:
1. Correctness: Did the candidate successfully solve the task? (Score 0-100)
   - If they fixed the bug or added the requested feature correctly, give a high score (80-100).
   - If they made partial progress or had minor bugs, give a medium score (40-79).
   - If they failed or submitted empty/irrelevant changes, give a low score (0-39).
2. Code Style Alignment: How does their code style, naming conventions, indentation, and logic compare to the original code in the file?
   - Return one of: "High" | "Medium" | "Low".
3. feedback: Write a 2-3 sentence concise explanation summary.

Return ONLY a valid JSON object matching the schema:
{
  "score": 85,
  "evaluationText": "Candidate correctly fixed the index out of bounds error, using identical formatting conventions as the rest of the class.",
  "codeStyleMatch": "High" | "Medium" | "Low"
}
Do NOT wrap your JSON in markdown code blocks.`;

    const userPrompt = `### Challenge Configuration:
File Path: ${challenge.filePath}
Task Type: ${challenge.challengeType === 'bug' ? 'Bug Fix' : 'Feature Addition'}

### Challenge Description:
${challenge.taskDescription}

### Original Code:
\`\`\`
${challenge.originalCode}
\`\`\`

### Reference Solution:
\`\`\`
${challenge.referenceSolution}
\`\`\`

### Candidate's Submitted Code:
\`\`\`
${submittedCode || ''}
\`\`\``;

    let evaluation = {
      score: 50,
      evaluationText: 'Failed to execute automated code evaluation loop.',
      codeStyleMatch: 'Medium'
    };

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText.trim());
      if (parsed.score !== undefined && parsed.evaluationText && parsed.codeStyleMatch) {
        evaluation = {
          score: Math.max(0, Math.min(100, parsed.score)),
          evaluationText: parsed.evaluationText,
          codeStyleMatch: parsed.codeStyleMatch
        };
      }
    } catch (evalErr: any) {
      console.warn('[challenge-submit] Groq evaluation failed:', evalErr.message);
    }

    // 3. Save the submission & evaluation results, set status to completed
    const updatedResult = {
      ...result,
      challenge_submission: {
        submittedCode: submittedCode || '',
        completedAt: new Date().toISOString(),
        timeLeftSeconds: 0
      },
      challenge_evaluation: evaluation
    };

    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        remaining_seconds: 0,
        result: updatedResult
      })
      .eq('id', sessionId);

    if (updateErr) {
      console.error('[challenge-submit] Failed to update session completion:', updateErr);
      return NextResponse.json({ error: 'Failed to submit challenge solution.' }, { status: 500 });
    }

    // Trigger precompilation in background since coding challenge is the final stage
    const { compileAndSaveReport } = require('@/app/lib/reportCompiler');
    compileAndSaveReport(sessionId, true).catch((err: any) => {
      console.error('[challenge-submit] Async pre-compilation failed:', err.message);
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[challenge-submit] Error in API:', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
