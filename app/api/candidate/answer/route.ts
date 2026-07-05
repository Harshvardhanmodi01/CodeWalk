import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID, sanitizeString } from '@/app/lib/validation';

/**
 * Public/Candidate API to save or update an answer.
 * Validates session status (must be active) and sanitizes inputs before writing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, questionId, answerText } = body;

    // Validate request parameters
    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }
    if (!questionId || !validateUUID(questionId)) {
      return NextResponse.json({ error: 'Valid questionId parameter is required.' }, { status: 400 });
    }

    const sanitizedAnswer = sanitizeString(answerText || '');

    // 1. Verify session exists and is currently active
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'This session is no longer active. Answers are frozen.' }, { status: 400 });
    }

    // 2. Check if answer already exists for this question in this session
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('answers')
      .select('id, ai_score')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (findErr) {
      console.error('Candidate answer search failed:', findErr);
      return NextResponse.json({ error: 'Database verification failed.' }, { status: 500 });
    }

    if (existing) {
      // 3a. Update existing answer text
      const { error: updErr } = await supabaseAdmin
        .from('answers')
        .update({
          answer_text: sanitizedAnswer,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updErr) {
        console.error('Candidate answer update failed:', updErr);
        return NextResponse.json({ error: 'Failed to update answer draft.' }, { status: 500 });
      }
    } else {
      // 3b. Insert new answer record
      const { error: insErr } = await supabaseAdmin
        .from('answers')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          answer_text: sanitizedAnswer,
          ai_score: 5 // default starting score
        });

      if (insErr) {
        console.error('Candidate answer insert failed:', insErr);
        return NextResponse.json({ error: 'Failed to save new answer draft.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Candidate answer POST error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
