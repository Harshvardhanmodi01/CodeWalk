import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';

/**
 * POST /api/candidate/proctoring
 * Logs a new proctoring event and/or updates the live status and summary (integrity score & risk level).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      candidateId,
      eventType = null,
      severity = null,
      durationSeconds = 0,
      snapshotUrl = null,
      details = {},
      liveStatus = null
    } = body;

    // Validate inputs
    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }
    if (!candidateId || !validateUUID(candidateId)) {
      return NextResponse.json({ error: 'Valid candidateId parameter is required.' }, { status: 400 });
    }

    // Verify session exists and is active
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'This session is no longer active.' }, { status: 400 });
    }

    // 1. Log the new proctoring event if eventType is provided
    if (eventType) {
      if (!severity) {
        return NextResponse.json({ error: 'severity parameter is required when eventType is provided.' }, { status: 400 });
      }

      const { error: insertErr } = await supabaseAdmin
        .from('proctoring_events')
        .insert({
          session_id: sessionId,
          candidate_id: candidateId,
          event_type: eventType,
          severity,
          duration_seconds: durationSeconds,
          snapshot_url: snapshotUrl,
          details
        });

      if (insertErr) {
        console.error('Failed to insert proctoring event:', insertErr);
        return NextResponse.json({ error: 'Failed to record proctoring event.' }, { status: 500 });
      }
    }

    // 2. Fetch all proctoring events for this session to recalculate summary counts
    const { data: events, error: eventsErr } = await supabaseAdmin
      .from('proctoring_events')
      .select('event_type, duration_seconds')
      .eq('session_id', sessionId);

    if (eventsErr || !events) {
      console.error('Failed to fetch session events:', eventsErr);
      return NextResponse.json({ error: 'Failed to update proctoring summary.' }, { status: 500 });
    }

    // 3. Count occurrences and durations
    let tabSwitches = 0;
    let faceNotVisibleSeconds = 0;
    let multipleFacesCount = 0;
    let copyAttempts = 0;
    let screenSharingInterruptions = 0;
    let keyboardShortcutsCount = 0;
    let suspiciousScreenActivities = 0;

    events.forEach(e => {
      switch (e.event_type) {
        case 'tab_switch':
        case 'window_blur':
          tabSwitches++;
          break;
        case 'face_not_visible':
          faceNotVisibleSeconds += e.duration_seconds || 10;
          break;
        case 'multiple_faces':
          multipleFacesCount++;
          break;
        case 'copy_attempt':
          copyAttempts++;
          break;
        case 'screen_sharing_stopped':
          screenSharingInterruptions++;
          break;
        case 'keyboard_shortcut':
        case 'developer_tools_opened':
          keyboardShortcutsCount++;
          break;
        case 'suspicious_screen_activity':
          suspiciousScreenActivities++;
          break;
        default:
          break;
      }
    });

    // 4. Calculate Integrity Score (starts at 100)
    let score = 100;
    score -= tabSwitches * 5;
    score -= Math.floor(faceNotVisibleSeconds / 30) * 3;
    score -= multipleFacesCount * 20;
    score -= copyAttempts * 10;
    score -= screenSharingInterruptions * 15;
    score -= keyboardShortcutsCount * 10;
    score -= suspiciousScreenActivities * 15;

    // Clamp score to [0, 100]
    score = Math.max(0, Math.min(100, score));

    // 5. Determine Risk Level
    let riskLevel = 'low';
    if (screenSharingInterruptions > 0 || multipleFacesCount > 1 || suspiciousScreenActivities > 0 || score < 30) {
      riskLevel = 'critical';
    } else if (score < 50) {
      riskLevel = 'high';
    } else if (score < 80) {
      riskLevel = 'medium';
    }

    // 6. Build the update payload
    const upsertPayload: any = {
      session_id: sessionId,
      total_tab_switches: tabSwitches,
      total_face_not_visible_seconds: faceNotVisibleSeconds,
      multiple_faces_count: multipleFacesCount,
      copy_attempts: copyAttempts,
      screen_sharing_interruptions: screenSharingInterruptions,
      overall_integrity_score: score,
      risk_level: riskLevel,
      generated_at: new Date().toISOString()
    };

    // Include liveStatus if provided
    if (liveStatus) {
      upsertPayload.live_status = liveStatus;
    }

    // 7. Upsert the proctoring summary
    const { data: summary, error: summaryErr } = await supabaseAdmin
      .from('proctoring_summary')
      .upsert(upsertPayload, { onConflict: 'session_id' })
      .select()
      .single();

    if (summaryErr) {
      console.error('Failed to upsert proctoring summary:', summaryErr);
      return NextResponse.json({ error: 'Failed to update summary record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, summary });

  } catch (err: any) {
    console.error('Proctoring POST error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
