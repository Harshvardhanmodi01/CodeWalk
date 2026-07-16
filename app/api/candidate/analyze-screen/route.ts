import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, screenshot } = body;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }

    if (!screenshot || typeof screenshot !== 'string' || !screenshot.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Valid base64 image data URL screenshot is required.' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: groqKey });

    // 1. Verify session exists and get candidate_id
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('status, candidate_id')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active.' }, { status: 400 });
    }

    // 2. Call Groq Vision Model to analyze the screenshot
    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this screenshot from a candidate\'s shared screen during a coding interview. Look for suspicious activity, including: 1. A browser window or tab containing ChatGPT, Claude, Gemini, or any AI assistant. 2. A code editor or external IDE with the interview question pasted (outside of the interview platform window). 3. Messaging applications (Slack, Discord, WhatsApp, Telegram, etc.) with interview content visible or indicating active communication. If any of these are detected, set suspicious=true. Return ONLY a valid JSON object: { "suspicious": boolean, "reason": string | null, "confidence": "low" | "medium" | "high" }.'
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshot
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{}';
    const parsedResult = JSON.parse(resultText);

    // 3. If suspicious and confidence is high or medium, log a proctoring event
    if (parsedResult.suspicious && ['high', 'medium'].includes(parsedResult.confidence)) {
      const severity = parsedResult.confidence === 'high' ? 'high' : 'medium';
      
      // We will save the screenshot to storage to display it in the recruiter report
      // To do this, we parse base64 and upload to proctoring-snapshots bucket
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `screen-analysis-${Date.now()}.jpg`;
      const path = `${sessionId}/${filename}`;
      
      const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
        .from('proctoring-snapshots')
        .upload(path, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      let snapshotUrl = null;
      if (!uploadErr && uploadData) {
        snapshotUrl = `proctoring-snapshots/${path}`;
      }

      // Log the event
      await supabaseAdmin
        .from('proctoring_events')
        .insert({
          session_id: sessionId,
          candidate_id: session.candidate_id,
          event_type: 'suspicious_screen_activity',
          severity,
          duration_seconds: 0,
          snapshot_url: snapshotUrl,
          details: {
            reason: parsedResult.reason,
            confidence: parsedResult.confidence
          }
        });

      // Fetch all events to recalculate summary
      const { data: events } = await supabaseAdmin
        .from('proctoring_events')
        .select('event_type, duration_seconds')
        .eq('session_id', sessionId);

      if (events) {
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

        let score = 100;
        score -= tabSwitches * 5;
        score -= Math.floor(faceNotVisibleSeconds / 30) * 3;
        score -= multipleFacesCount * 20;
        score -= copyAttempts * 10;
        score -= screenSharingInterruptions * 15;
        score -= keyboardShortcutsCount * 10;
        score -= suspiciousScreenActivities * 15; // Deduct 15 points per screen warning

        score = Math.max(0, Math.min(100, score));

        let riskLevel = 'low';
        if (screenSharingInterruptions > 0 || multipleFacesCount > 1 || suspiciousScreenActivities > 0 || score < 30) {
          riskLevel = 'critical';
        } else if (score < 50) {
          riskLevel = 'high';
        } else if (score < 80) {
          riskLevel = 'medium';
        }

        await supabaseAdmin
          .from('proctoring_summary')
          .upsert({
            session_id: sessionId,
            total_tab_switches: tabSwitches,
            total_face_not_visible_seconds: faceNotVisibleSeconds,
            multiple_faces_count: multipleFacesCount,
            copy_attempts: copyAttempts,
            screen_sharing_interruptions: screenSharingInterruptions,
            overall_integrity_score: score,
            risk_level: riskLevel,
            generated_at: new Date().toISOString()
          }, { onConflict: 'session_id' });
      }
    }

    return NextResponse.json({ success: true, analysis: parsedResult });

  } catch (err: any) {
    console.error('Screen analysis route error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
