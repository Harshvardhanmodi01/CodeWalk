import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, recruiterId, eventType, eventDescription } = await req.json();

    if (!candidateId || !eventType || !eventDescription) {
      return NextResponse.json({ error: 'candidateId, eventType, and eventDescription are required' }, { status: 400 });
    }

    // Insert event via admin client to bypass recruiter RLS restrictions on public actions
    const { data: newEvent, error } = await supabaseAdmin
      .from('candidate_events')
      .insert({
        candidate_id: candidateId,
        recruiter_id: recruiterId || null,
        event_type: eventType,
        event_description: eventDescription
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log candidate event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: any) {
    console.error('API log-event error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
