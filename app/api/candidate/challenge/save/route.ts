import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, submittedCode, timeLeftSeconds, started } = body;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required.' }, { status: 400 });
    }

    const { data: session, error: getErr } = await supabaseAdmin
      .from('sessions')
      .select('result')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const result = session.result || {};
    const challengeSubmission = {
      submittedCode: submittedCode || '',
      timeLeftSeconds: timeLeftSeconds || 0,
      started: !!started,
      savedAt: new Date().toISOString()
    };

    const updatedResult = {
      ...result,
      challenge_submission: challengeSubmission
    };

    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({ result: updatedResult })
      .eq('id', sessionId);

    if (updateErr) {
      console.error('[challenge-save] Failed to update session result:', updateErr);
      return NextResponse.json({ error: 'Failed to save challenge progress.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[challenge-save] Error in API:', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
