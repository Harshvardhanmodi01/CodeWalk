import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { Resend } from 'resend';

// Helper to escape HTML characters
function escapeHtml(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch active projects (status is sent or in_progress)
    const { data: projects, error: fetchErr } = await supabaseAdmin
      .from('take_home_projects')
      .select(`
        *,
        profiles:recruiter_id (
          company_name
        ),
        candidates:candidate_id (
          name,
          email
        )
      `)
      .in('status', ['sent', 'in_progress']);

    if (fetchErr) {
      console.error('Failed to fetch projects for reminders:', fetchErr);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json({ message: 'No active projects requiring reminders.' });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const now = new Date();
    let remindersSentCount = 0;

    for (const project of projects) {
      const deadline = new Date(project.deadline);
      const diffMs = deadline.getTime() - now.getTime();
      
      // If project already expired, skip reminders
      if (diffMs <= 0) continue;

      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType: '3_days' | '1_day' | 'deadline_day' | null = null;
      let subject = '';
      let messageText = '';

      const sentReminders = project.reminders_sent || [];
      const companyName = project.profiles?.company_name || 'CodeWalk Partner';
      const candidateName = project.candidates?.name || 'Candidate';
      const candidateEmail = project.candidates?.email || '';

      if (diffDays <= 3 && diffDays > 1 && !sentReminders.includes('3_days')) {
        reminderType = '3_days';
        subject = `Reminder: Your project is due in 3 days — ${project.project_title}`;
        messageText = `This is a reminder that your take-home project assignment for <strong>${project.project_title}</strong> with <strong>${companyName}</strong> is due in <strong>3 days</strong>.`;
      } else if (diffDays <= 1 && diffHours > 12 && !sentReminders.includes('1_day')) {
        reminderType = '1_day';
        subject = `Reminder: Your project is due tomorrow — ${project.project_title}`;
        messageText = `This is a reminder that your take-home project assignment for <strong>${project.project_title}</strong> with <strong>${companyName}</strong> is due <strong>tomorrow</strong>.`;
      } else if (diffHours <= 12 && diffHours > 0 && !sentReminders.includes('deadline_day')) {
        reminderType = 'deadline_day';
        subject = `Today is your submission deadline — ${project.project_title}`;
        messageText = `This is a final reminder that your take-home project assignment for <strong>${project.project_title}</strong> with <strong>${companyName}</strong> is due <strong>today</strong>.`;
      }

      if (reminderType && candidateEmail) {
        const submissionUrl = `${siteUrl}/submit/${project.id}`;

        // Send Email
        const { error: emailErr } = await resend.emails.send({
          from: 'CodeWalk Invites <onboarding@resend.dev>',
          to: candidateEmail,
          subject: subject,
          html: `
            <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b494b; padding-bottom: 20px;">
                <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px;">Submission Reminder</h2>
              <p>Hi ${escapeHtml(candidateName)},</p>
              <p>${messageText}</p>
              
              <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 13px;">
                <p style="margin: 0; color: #F59E0B;"><strong>Deadline:</strong> ${deadline.toLocaleString()}</p>
              </div>

              <p>Please make sure to push your work to a public GitHub repository and submit the link before the deadline.</p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${submissionUrl}" style="background-color: #06B6D4; color: #0d1515; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                  View Project &amp; Submit Work
                </a>
              </div>
            </div>
          `
        });

        if (!emailErr) {
          // Update DB
          const updatedReminders = [...sentReminders, reminderType];
          const { error: updateErr } = await supabaseAdmin
            .from('take_home_projects')
            .update({ reminders_sent: updatedReminders })
            .eq('id', project.id);

          if (updateErr) {
            console.error(`Failed to update reminders for project ${project.id}:`, updateErr.message);
          } else {
            remindersSentCount++;
          }
        } else {
          console.warn(`Failed to send email to candidate ${candidateEmail}:`, emailErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      reminders_sent: remindersSentCount
    });
  } catch (err: any) {
    console.error('Failed to run reminder schedule:', err);
    return NextResponse.json({ error: err.message || 'Cron error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from('take_home_projects')
      .select(`
        *,
        profiles:recruiter_id (
          company_name
        ),
        candidates:candidate_id (
          name,
          email
        )
      `)
      .eq('id', projectId)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const deadline = new Date(project.deadline);
    const companyName = project.profiles?.company_name || 'CodeWalk Partner';
    const candidateName = project.candidates?.name || 'Candidate';
    const candidateEmail = project.candidates?.email || '';

    if (!candidateEmail) {
      return NextResponse.json({ error: 'Candidate email not found' }, { status: 400 });
    }

    const submissionUrl = `${siteUrl}/submit/${project.id}`;

    const { error: emailErr } = await resend.emails.send({
      from: 'CodeWalk Invites <onboarding@resend.dev>',
      to: candidateEmail,
      subject: `Reminder: Your project is due — ${project.project_title}`,
      html: `
        <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b494b; padding-bottom: 20px;">
            <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
          </div>
          
          <h2 style="color: #ffffff; font-size: 20px;">Submission Reminder</h2>
          <p>Hi ${escapeHtml(candidateName)},</p>
          <p>This is a quick reminder that your take-home project assignment for <strong>${project.project_title}</strong> with <strong>${companyName}</strong> is awaiting submission.</p>
          
          <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 0; color: #F59E0B;"><strong>Deadline:</strong> ${deadline.toLocaleString()}</p>
          </div>

          <p>Please make sure to push your work to a public GitHub repository and submit the link before the deadline.</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${submissionUrl}" style="background-color: #06B6D4; color: #0d1515; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
              View Project &amp; Submit Work
            </a>
          </div>
        </div>
      `
    });

    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 500 });
    }

    // Save reminder type logs
    const sentReminders = project.reminders_sent || [];
    const { error: updateErr } = await supabaseAdmin
      .from('take_home_projects')
      .update({ reminders_sent: [...sentReminders, 'manual_reminder'] })
      .eq('id', project.id);

    if (updateErr) {
      console.warn('Failed to log manual reminder in reminders_sent:', updateErr.message);
    }

    return NextResponse.json({ success: true, message: 'Manual reminder sent successfully' });
  } catch (err: any) {
    console.error('Failed to send manual reminder:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

