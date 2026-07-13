import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { Resend } from 'resend';
import { requireAuth } from '@/app/lib/auth-middleware';

function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const userId = authResult.id;
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // 2. Fetch sender profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, name')
      .eq('id', userId)
      .single();

    const companyName = escapeHtml(profile?.company_name || 'CodeWalk Recruiter');
    const senderName = escapeHtml(profile?.name || 'Your Colleague');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 3. Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    let emailWarning = '';

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const { data: emailData, error: emailErr } = await resend.emails.send({
          from: 'CodeWalk Invites <onboarding@resend.dev>',
          to: email.trim(),
          subject: `${senderName} invited you to join the ${companyName} team on CodeWalk`,
          html: `
            <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="font-size: 24px; font-weight: bold; color: #06B6D4;">CodeWalk</span>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px; border-bottom: 1px solid #3b494b; padding-bottom: 10px; margin-bottom: 20px;">Workspace Invitation</h2>
              
              <p>Hello,</p>
              <p><strong>${senderName}</strong> has invited you to join the <strong>${companyName}</strong> team on CodeWalk as a technical screen recruiter.</p>
              
              <p>With CodeWalk, your team can review repository walks, build custom interview libraries, and lead technical screeners.</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${siteUrl}/register?invite=true&email=${encodeURIComponent(email)}" style="background-color: #00f0ff; color: #002022; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="font-size: 12px; color: #849495;">
                If you already have an account, simply login at <a href="${siteUrl}/login" style="color: #06B6D4;">${siteUrl}/login</a>.
              </p>
            </div>
          `
        });

        if (emailErr) {
          console.error('Resend email error:', emailErr);
          // Check for Sandbox domain restriction
          if (emailErr.message && emailErr.message.includes('onboarding@resend.dev')) {
            emailWarning = 'Sandbox restriction: free Resend keys only allow sending to the Resend account owner\'s email address. To invite others, please verify your custom domain on Resend.';
          } else {
            emailWarning = `Email delivery warning: ${emailErr.message}`;
          }
        } else {
          emailSent = true;
        }
      } catch (err: any) {
        console.error('Error invoking Resend client:', err);
        emailWarning = `Email client warning: ${err.message || err}`;
      }
    } else {
      emailWarning = 'Email API key missing on server. Invitation saved locally, but no email was sent.';
    }

    // 4. Try saving in Supabase database
    let databaseSaved = false;
    let databaseWarning = '';

    try {
      const { error: dbError } = await supabaseAdmin
        .from('team_invitations')
        .insert({
          email: email.trim(),
          invited_by: userId,
          invited_by_email: authResult.email || 'recruiter',
          status: 'pending'
        });

      if (dbError) throw dbError;
      databaseSaved = true;
    } catch (dbError: any) {
      console.warn('Database save failed (table might be missing), using client fallback:', dbError.message);
      databaseWarning = 'Table team_invitations does not exist. Saved to local storage fallback instead.';
    }

    return NextResponse.json({
      success: true,
      emailSent,
      databaseSaved,
      emailWarning,
      databaseWarning
    });

  } catch (err: any) {
    console.error('API team-invite error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong.' }, { status: 500 });
  }
}
