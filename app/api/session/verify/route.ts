import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // 1. Fetch session and join candidate details (uses admin to bypass RLS for public access)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        candidate:candidate_id (
          id,
          name,
          email,
          github_url
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // 2. If link_opened_at is null, update it and log event
    if (!session.link_opened_at) {
      const now = new Date().toISOString();
      
      // Update sessions link_opened_at
      await supabaseAdmin
        .from('sessions')
        .update({ link_opened_at: now })
        .eq('id', sessionId);

      // Log 'link_opened' event in candidate_events
      await supabaseAdmin
        .from('candidate_events')
        .insert({
          candidate_id: session.candidate_id,
          recruiter_id: session.recruiter_id,
          event_type: 'link_opened',
          event_description: 'Candidate viewed the interview link'
        });

      // Update local object for return payload
      session.link_opened_at = now;
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('API session verify error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
