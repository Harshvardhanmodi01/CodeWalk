import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { extractRepoInfo, fetchGitHub } from '@/app/lib/github';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, githubUrl, notes = '' } = body;

    if (!projectId || !githubUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and githubUrl' },
        { status: 400 }
      );
    }

    // 1. Parse GitHub repository info
    let owner = '', repo = '';
    try {
      const info = extractRepoInfo(githubUrl);
      owner = info.owner;
      repo = info.repo;
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Invalid GitHub URL format.' }, { status: 400 });
    }

    // 2. Validate that the GitHub repository is public
    const githubToken = process.env.GITHUB_TOKEN;
    const gitCheckUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const checkRes = await fetchGitHub(gitCheckUrl, githubToken);

    if (checkRes.status === 404) {
      return NextResponse.json(
        { error: `GitHub repository '${owner}/${repo}' not found. Please ensure it exists and is public.` },
        { status: 400 }
      );
    }

    if (!checkRes.ok) {
      return NextResponse.json(
        { error: 'Failed to verify GitHub repository. Please ensure it is public and try again.' },
        { status: 400 }
      );
    }

    const repoData = await checkRes.json();
    if (repoData.private) {
      return NextResponse.json(
        { error: 'The repository is private. CodeWalk requires a public repository to run code analysis.' },
        { status: 400 }
      );
    }

    // 3. Fetch project and recruiter/candidate details
    const { data: project, error: projErr } = await supabaseAdmin
      .from('take_home_projects')
      .select(`
        *,
        profiles:recruiter_id (
          email,
          company_name,
          name
        ),
        candidates:candidate_id (
          name,
          email
        )
      `)
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Take-home project not found.' }, { status: 404 });
    }

    const recruiter = (project as any).profiles;
    const candidate = (project as any).candidates;
    const companyName = recruiter?.company_name || 'CodeWalk Partner';
    const candidateName = candidate?.name || 'Candidate';
    const candidateEmail = candidate?.email || '';

    // 4. Update project record to submitted
    const { error: updateErr } = await supabaseAdmin
      .from('take_home_projects')
      .update({
        status: 'submitted',
        submission_repo_url: githubUrl,
        submission_notes: notes,
        submitted_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateErr) {
      console.error('Failed to update project status:', updateErr);
      return NextResponse.json({ error: 'Failed to update submission in database.' }, { status: 500 });
    }

    // 5. Send Emails via Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      // A. Candidate Confirmation Email
      await resend.emails.send({
        from: 'CodeWalk Invites <onboarding@resend.dev>',
        to: candidateEmail || project.candidate_email,
        subject: `Project Submission Received — ${project.project_title}`,
        html: `
          <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b494b; padding-bottom: 20px;">
              <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
            </div>
            
            <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 15px;">Submission Confirmed</h2>
            <p>Hi ${candidateName},</p>
            <p>We have successfully received your take-home project submission for <strong>${project.project_title}</strong> with <strong>${companyName}</strong>.</p>
            
            <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 13px;">
              <p style="margin: 0; color: #06B6D4;"><strong>Submitted Repository:</strong></p>
              <p style="margin: 5px 0 0 0; font-family: monospace; color: #ffffff;">${githubUrl}</p>
            </div>

            <p>Our analysis engine has been triggered to review your repository structure and code quality. The recruiter has been notified and will review your application shortly.</p>
            <p>Best of luck with your application!</p>
          </div>
        `
      }).catch(err => console.warn('Failed to send candidate confirmation email:', err));

      // B. Recruiter Notification Email
      if (recruiter?.email) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const dashboardUrl = `${siteUrl}/take-home`;

        await resend.emails.send({
          from: 'CodeWalk Invites <onboarding@resend.dev>',
          to: recruiter.email,
          subject: `[Project Submitted] ${candidateName} — ${project.project_title}`,
          html: `
            <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b494b; padding-bottom: 20px;">
                <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 15px;">Take-Home Project Submitted</h2>
              <p>Hello ${recruiter.name || 'Recruiter'},</p>
              <p>Candidate <strong>${candidateName}</strong> has submitted their take-home project assignment for the <strong>${project.project_title}</strong> position.</p>
              
              <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 20px; margin: 20px 0; font-size: 13px; color: #b9cacb;">
                <p style="margin: 0;"><strong>Candidate:</strong> ${candidateName} (${candidateEmail})</p>
                <p style="margin: 5px 0 0 0;"><strong>Repository:</strong> <a href="${githubUrl}" style="color: #06B6D4; text-decoration: underline;" target="_blank">${githubUrl}</a></p>
                ${notes ? `<p style="margin: 10px 0 0 0; font-style: italic;"><strong>Candidate Notes:</strong> "${notes}"</p>` : ''}
              </div>

              <p>Our Auto-Analysis engine has been triggered to generate code quality, feature completion, and commit history scores. You can view the results directly in your CodeWalk dashboard.</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${dashboardUrl}" style="background-color: #06B6D4; color: #0d1515; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                  View Projects Dashboard
                </a>
              </div>
            </div>
          `
        }).catch(err => console.warn('Failed to send recruiter notification email:', err));
      }
    }

    // 6. Trigger Auto-Analysis Engine asynchronously (via fire-and-forget fetch)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const analyzeUrl = `${siteUrl}/api/take-home/analyze`;
    
    // We dispatch this without awaiting it so candidate submission completes instantly
    fetch(analyzeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    }).catch(err => console.error('Failed to trigger analysis route fetch:', err));

    return NextResponse.json({
      success: true,
      status: 'submitted'
    });
  } catch (err: any) {
    console.error('Submission handling error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to handle project submission.' },
      { status: 500 }
    );
  }
}
