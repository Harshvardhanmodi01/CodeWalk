import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
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

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const recruiterId = authResult.id;
    const body = await req.json();
    const {
      candidateId,
      candidateEmail,
      candidateName,
      positionId,
      projectTitle,
      projectDescription,
      techStackRequired = [],
      experienceLevel,
      difficulty,
      durationDays,
      deadline,
      evaluationCriteria,
      projectBrief,
      uniqueRequirements,
      customMessage = ''
    } = body;

    if (!candidateEmail || !projectTitle || !projectBrief || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateEmail, projectTitle, projectBrief, and deadline' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    let finalCandidateId = candidateId;

    if (!finalCandidateId) {
      if (!candidateName) {
        return NextResponse.json(
          { error: 'Candidate name is required to assign a new project.' },
          { status: 400 }
        );
      }

      // Check if a candidate with this email already exists for this recruiter
      const { data: existingCand } = await supabase
        .from('candidates')
        .select('id')
        .eq('recruiter_id', recruiterId)
        .eq('email', candidateEmail.trim())
        .maybeSingle();

      if (existingCand) {
        finalCandidateId = existingCand.id;
      } else {
        // Create new candidate
        const { data: newCand, error: createError } = await supabase
          .from('candidates')
          .insert({
            name: candidateName.trim(),
            email: candidateEmail.trim(),
            recruiter_id: recruiterId,
            status: 'screening',
            github_url: ''
          })
          .select()
          .single();

        if (createError || !newCand) {
          console.error('Failed to auto-create candidate:', createError);
          return NextResponse.json({ error: 'Failed to create candidate record.' }, { status: 500 });
        }
        finalCandidateId = newCand.id;
      }
    }

    // 1. Fetch Recruiter Profile to get Company Name
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('company_name, name')
      .eq('id', recruiterId)
      .single();

    if (profileErr) {
      console.warn('Could not fetch recruiter profile:', profileErr.message);
    }

    const companyName = profile?.company_name || 'CodeWalk Partner';
    const recruiterName = profile?.name || 'Hiring Manager';

    // 2. Save the project to take_home_projects table
    const { data: project, error: insertErr } = await supabase
      .from('take_home_projects')
      .insert({
        recruiter_id: recruiterId,
        candidate_id: finalCandidateId,
        position_id: positionId || null,
        project_title: projectTitle,
        project_description: projectDescription,
        tech_stack_required: techStackRequired,
        experience_level: experienceLevel || 'Experienced',
        difficulty: difficulty || 'mid',
        duration_days: parseInt(durationDays) || 5,
        deadline: new Date(deadline).toISOString(),
        evaluation_criteria: evaluationCriteria || {},
        project_brief: typeof projectBrief === 'string' ? projectBrief : JSON.stringify(projectBrief),
        unique_requirements: uniqueRequirements || {},
        status: 'sent'
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Failed to save project:', insertErr);
      return NextResponse.json({ error: 'Failed to save project to database.' }, { status: 500 });
    }

    // 3. Send Email to Candidate using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is missing from environment variables.');
      return NextResponse.json({
        success: true,
        projectId: project.id,
        warning: 'Email invitation could not be sent (RESEND_API_KEY is missing).',
        submitUrl: `/submit/${project.id}`
      });
    }

    const resend = new Resend(resendApiKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const submissionUrl = `${siteUrl}/submit/${project.id}`;

    // Extract core requirements list from JSON brief if it is a JSON object
    let parsedBrief: any = {};
    try {
      parsedBrief = typeof projectBrief === 'string' ? JSON.parse(projectBrief) : projectBrief;
    } catch {
      parsedBrief = {};
    }

    const coreReqs = parsedBrief.core_requirements || [];
    const bonusReqs = parsedBrief.bonus_requirements || [];
    const twist = parsedBrief.unique_twist || project.unique_requirements?.twist || '';

    // Render checklists in HTML
    const coreReqsHtml = Array.isArray(coreReqs)
      ? coreReqs.map(req => `<li style="margin-bottom: 8px; color: #f1f5f9;">⬜ ${escapeHtml(req)}</li>`).join('')
      : '';
    const bonusReqsHtml = Array.isArray(bonusReqs)
      ? bonusReqs.map(req => `<li style="margin-bottom: 8px; color: #94a3b8;">⬜ ${escapeHtml(req)}</li>`).join('')
      : '';

    const formattedDeadline = new Date(deadline).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailSubject = `Take Home Project Assignment — ${escapeHtml(projectTitle)} — ${escapeHtml(companyName)}`;
    const emailBody = `
      <div style="background-color: #0d1515; color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b494b; padding-bottom: 20px;">
          <span style="font-size: 24px; font-weight: bold; color: #06B6D4; letter-spacing: 1px;">CodeWalk</span>
        </div>
        
        <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 10px;">Take-Home Project Assignment</h2>
        <p style="color: #94a3b8; font-size: 14px;">For position: <strong>${escapeHtml(projectTitle)}</strong></p>
        
        <p style="margin-top: 20px; font-size: 15px; color: #f1f5f9;">Hi ${escapeHtml(candidateName)},</p>
        
        <p style="font-size: 15px; color: #f1f5f9;">
          Thank you for applying to ${escapeHtml(companyName)}! To help us evaluate your hands-on coding and software engineering skills, we have assigned you a custom take-home project.
        </p>

        ${customMessage ? `<div style="background-color: #151d1e; border-left: 3px solid #06B6D4; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #b9cacb; font-size: 14px;">"${escapeHtml(customMessage)}"</div>` : ''}

        <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #06B6D4; font-size: 16px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Project Brief Overview</h3>
          <p style="margin-top: 0; color: #f1f5f9; font-size: 14px;"><strong>Problem Statement:</strong><br/>${escapeHtml(parsedBrief.problem_statement || projectDescription)}</p>
          
          ${twist ? `<p style="color: #f1f5f9; font-size: 14px;"><strong>Your Candidate-Specific Requirement (Unique Twist):</strong><br/><span style="color: #818CF8;">${escapeHtml(twist)}</span></p>` : ''}
          
          ${coreReqsHtml ? `
            <p style="margin-bottom: 8px; color: #06B6D4; font-size: 14px; font-weight: bold;">Core Requirements:</p>
            <ul style="list-style: none; padding-left: 0; margin-top: 0; font-size: 14px;">
              ${coreReqsHtml}
            </ul>
          ` : ''}

          ${bonusReqsHtml ? `
            <p style="margin-bottom: 8px; color: #06B6D4; font-size: 14px; font-weight: bold;">Bonus Objectives (Optional):</p>
            <ul style="list-style: none; padding-left: 0; margin-top: 0; font-size: 14px;">
              ${bonusReqsHtml}
            </ul>
          ` : ''}
        </div>

        <div style="border-top: 1px solid #3b494b; padding-top: 20px; margin-top: 25px;">
          <p style="font-size: 15px; color: #ffffff;">⏰ <strong>Submission Deadline:</strong> <span style="color: #F59E0B;">${formattedDeadline}</span></p>
          <p style="font-size: 14px; color: #94a3b8;">
            Please complete this project in a public GitHub repository. You should submit your repository URL and any optional notes using your private submission page link below.
          </p>
        </div>

        <div style="text-align: center; margin: 35px 0 25px 0;">
          <a href="${submissionUrl}" style="background-color: #06B6D4; color: #0d1515; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);">
            View Project &amp; Submit Work
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 40px; border-top: 1px solid #3b494b/40; padding-top: 15px;">
          Sent via CodeWalk on behalf of ${escapeHtml(companyName)}.<br/>
          If you have any questions, please reply directly to this email.
        </p>
      </div>
    `;

    const { error: emailErr } = await resend.emails.send({
      from: 'CodeWalk Invites <onboarding@resend.dev>',
      to: candidateEmail,
      subject: emailSubject,
      html: emailBody
    });

    if (emailErr) {
      console.warn('Resend email delivery failed:', emailErr);
      // We will still succeed because the project was saved to the DB, but return a warning
      return NextResponse.json({
        success: true,
        projectId: project.id,
        warning: 'Saved successfully but failed to send email. Error: ' + emailErr.message,
        submitUrl: submissionUrl
      });
    }

    // 4. Update Candidate Status to "Project Assigned"
    const { error: candErr } = await supabase
      .from('candidates')
      .update({ status: 'Project Assigned' })
      .eq('id', finalCandidateId);

    if (candErr) {
      console.warn('Failed to update candidate status to Project Assigned:', candErr.message);
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      submitUrl: submissionUrl
    });
  } catch (err: any) {
    console.error('Failed to assign take-home project:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to assign take-home project' },
      { status: 500 }
    );
  }
}
