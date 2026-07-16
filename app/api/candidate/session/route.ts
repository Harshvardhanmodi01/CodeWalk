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

    // 1. Fetch session details (including interview_mode, mode_config, is_paused)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('id, candidate_id, status, started_at, ended_at, timer_duration_minutes, repo_url, remaining_seconds, created_at, interview_mode, mode_config, is_paused')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Interview session not found.' }, { status: 404 });
    }

    // 2. Fetch session questions (including options)
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, code_snippet, file_path, line_start, line_end, difficulty, category, order_index, show_expected_answer, shared_answer, options')
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

/**
 * Public/Candidate API to submit/complete the session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, status, action } = body;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }

    // Handle Start Action (Setup Wizard Complete)
    if (action === 'start') {
      const { data: session, error: getErr } = await supabaseAdmin
        .from('sessions')
        .select('timer_duration_minutes')
        .eq('id', sessionId)
        .single();

      if (getErr || !session) {
        return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
      }

      // Reset started_at to now, set status to active, remaining_seconds to full duration
      const { error: updateErr } = await supabaseAdmin
        .from('sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          remaining_seconds: session.timer_duration_minutes * 60,
          is_paused: false
        })
        .eq('id', sessionId);

      if (updateErr) {
        console.error('Failed to start session timer:', updateErr);
        return NextResponse.json({ error: 'Failed to start interview session.' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Handle Clear Warning Action
    if (action === 'clear_warning') {
      const { error: updateErr } = await supabaseAdmin
        .from('sessions')
        .update({
          recruiter_warning: null
        })
        .eq('id', sessionId);

      if (updateErr) {
        console.error('Failed to clear recruiter warning:', updateErr);
        return NextResponse.json({ error: 'Failed to clear warning.' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Existing completed flow
    if (status !== 'completed') {
      return NextResponse.json({ error: 'Invalid status update request.' }, { status: 400 });
    }

    // Update session status to completed
    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        remaining_seconds: 0
      })
      .eq('id', sessionId);

    if (updateErr) {
      console.error('Failed to complete session:', updateErr);
      return NextResponse.json({ error: 'Failed to submit interview.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Candidate session POST error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

