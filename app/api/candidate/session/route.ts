import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';
import { sanitizeSession } from '@/app/lib/response-sanitizer';

/**
 * Public/Candidate API to fetch session details, questions, and answers.
 * Bypasses RLS using the admin client because candidates do not have recruiter logins,
 * but validates that the session ID is a secure, valid UUID.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }

    // 1. Fetch session details
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('id, candidate_id, status, started_at, ended_at, timer_duration_minutes, repo_url, remaining_seconds, created_at')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Interview session not found.' }, { status: 404 });
    }

    // 2. Fetch session questions
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, code_snippet, file_path, line_start, line_end, difficulty, category, order_index, show_expected_answer, shared_answer')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });

    if (qErr) {
      console.error('Questions fetch error:', qErr);
      return NextResponse.json({ error: 'Failed to retrieve session questions.' }, { status: 500 });
    }

    // 3. Fetch current answer drafts
    const { data: answers, error: ansErr } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('session_id', sessionId);

    if (ansErr) {
      console.error('Answers fetch error:', ansErr);
      return NextResponse.json({ error: 'Failed to retrieve session answers.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: sanitizeSession(session),
      questions: questions || [],
      answers: answers || []
    });

  } catch (err) {
    console.error('Candidate session GET error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
