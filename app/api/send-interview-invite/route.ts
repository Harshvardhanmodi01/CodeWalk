import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate recruiter
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized – please log in' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse request body
    const { candidateId, dateTime, duration, notes, justGenerate } = await req.json();

    if (!candidateId || !dateTime || !duration) {
      return NextResponse.json({ error: 'candidateId, dateTime, and duration are required' }, { status: 400 });
    }

    // 3. Fetch candidate details (uses recruiter client to respect RLS)
    const { data: candidate, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found or access denied' }, { status: 404 });
    }

    // 4. Create new interview session in scheduled state
    const durationMinutes = Number(duration);
    const { data: newSession, error: sessionErr } = await supabase
      .from('sessions')
      .insert({
        recruiter_id: userId,
        candidate_id: candidateId,
        repo_url: candidate.github_url,
        status: 'scheduled',
        timer_duration_minutes: durationMinutes,
        remaining_seconds: durationMinutes * 60,
        scheduled_at: dateTime
      })
      .select()
      .single();

    if (sessionErr || !newSession) {
      console.error('Session creation error:', sessionErr);
      return NextResponse.json({ error: 'Failed to create interview session' }, { status: 500 });
    }

    // 5. Generate unique candidate interview link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const sessionUrl = `${siteUrl}/candidate/${newSession.id}`;

    // 6. Handle Email invitation (if not just generating link)
    if (!justGenerate) {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY is missing from environment variables.');
        return NextResponse.json({ 
          error: 'Email configuration is missing. You can still use the "Just Generate Link" option.',
          sessionId: newSession.id,
          sessionUrl
        }, { status: 500 });
      }

      // Fetch recruiter company name to customize email signature
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, name')
        .eq('id', userId)
        .single();
      const companyName = profile?.company_name || 'CodeWalk Recruiter';

      const resend = new Resend(resendApiKey);

      const formattedDate = new Date(dateTime).toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = new Date(dateTime).toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const { data: emailData, error: emailErr } = await resend.emails.send({
        from: 'CodeWalk Invites <onboarding@resend.dev>',
        to: candidate.email,
        subject: `Your Technical Interview with ${companyName} — CodeWalk`,
        html: `
          <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px border #3b494b;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
            </div>
            
            <h2 style="color: #ffffff; font-size: 20px; border-bottom: 1px solid #3b494b; pb-10; margin-bottom: 20px;">Technical Assessment Scheduled</h2>
            
            <p>Hi ${candidate.name},</p>
            <p>We have scheduled a technical code story review session with <strong>${companyName}</strong>.</p>
            
            <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 20px; margin: 25px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #b9cacb;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 100px; color: #06B6D4;">Date:</td>
                  <td style="padding: 6px 0; color: #ffffff;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #06B6D4;">Time:</td>
                  <td style="padding: 6px 0; color: #ffffff;">${formattedTime} (Local Time)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #06B6D4;">Duration:</td>
                  <td style="padding: 6px 0; color: #ffffff;">${durationMinutes} minutes</td>
                </tr>
              </table>
            </div>

            <p style="margin-bottom: 30px;">During this session, you will review code from your GitHub repository (<strong>${candidate.github_url.split('/').pop()}</strong>) and answer AI-facilitated architecture and coding questions.</p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${sessionUrl}" style="background-color: #06B6D4; color: #0d1515; font-weight: bold; text-decoration: none; padding: 12px 30px; border-radius: 6px; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Join Interview</a>
            </div>

            <p style="font-size: 12px; color: #94A3B8; line-height: 1.5;">Please ensure you have a stable internet connection, Chrome or any modern desktop browser, and your GitHub repository context handy. Good luck!</p>
            
            <div style="margin-top: 40px; border-t: 1px solid #3b494b; padding-top: 20px; font-size: 11px; text-align: center; color: #94A3B8;">
              Sent via CodeWalk — AI-powered codebase screening platform.
            </div>
          </div>
        `
      });

      if (emailErr) {
        console.warn('Resend email delivery failed (graceful bypass):', emailErr);
        
        // Update candidate status anyway
        const newNotes = notes ? `${candidate.notes || ''}\n[Scheduled Notes]: ${notes}` : candidate.notes;
        await supabaseAdmin
          .from('candidates')
          .update({ 
            status: 'scheduled',
            notes: newNotes
          })
          .eq('id', candidateId);

        // Log event with failure warning
        await supabaseAdmin
          .from('candidate_events')
          .insert({
            candidate_id: candidateId,
            recruiter_id: userId,
            event_type: 'link_sent',
            event_description: `Interview scheduled for ${new Date(dateTime).toLocaleString()}, but email delivery failed: ${emailErr.message}. Join Link: ${sessionUrl}`
          });

        return NextResponse.json({
          success: true,
          emailSent: false,
          warning: `Interview scheduled, but email invite delivery failed: ${emailErr.message}. Please copy the join link manually.`,
          sessionId: newSession.id,
          sessionUrl
        });
      }
    }

    // 7. Update candidate status to 'scheduled' and update notes if provided
    const newNotes = notes ? `${candidate.notes || ''}\n[Scheduled Notes]: ${notes}` : candidate.notes;
    await supabaseAdmin
      .from('candidates')
      .update({ 
        status: 'scheduled',
        notes: newNotes
      })
      .eq('id', candidateId);

    // 8. Log communication log event in candidate_events table
    const eventDescription = justGenerate 
      ? `Interview link generated: ${sessionUrl}`
      : `Interview scheduled for ${new Date(dateTime).toLocaleString()} and link sent to ${candidate.email}`;

    await supabaseAdmin
      .from('candidate_events')
      .insert({
        candidate_id: candidateId,
        recruiter_id: userId,
        event_type: 'link_sent',
        event_description: eventDescription
      });

    return NextResponse.json({
      success: true,
      emailSent: !justGenerate,
      sessionId: newSession.id,
      sessionUrl
    });

  } catch (err: any) {
    console.error('API send-interview-invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
