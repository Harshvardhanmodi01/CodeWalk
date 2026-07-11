import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { sanitizeString, validateEmail, validatePassword } from '@/app/lib/validation';
import { logSecurityEvent, validateNonceAndTimestamp } from '@/app/lib/security';
import { pickAllowed } from '@/app/lib/whitelist';

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  // Verify CSRF, timestamp, and nonce (Fix 8: Replay & CSRF Protection)
  const cookieToken = req.cookies.get('csrf_token')?.value;
  const headerToken = req.headers.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json({ error: 'CSRF token mismatch or missing' }, { status: 403 });
  }

  const nonce = req.headers.get('x-request-nonce');
  const timestamp = req.headers.get('x-request-timestamp');
  const replayCheck = validateNonceAndTimestamp(nonce, timestamp);
  if (!replayCheck.success) {
    return NextResponse.json({ error: replayCheck.error }, { status: replayCheck.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const allowedFields = ['email', 'password', 'fullName', 'company', 'redirectTo'];
    const restrictedFields = ['plan', 'tokens_total', 'tokens_used', 'role', 'is_admin', 'recruiter_id'];
    const whitelistedData = pickAllowed(body, allowedFields, restrictedFields, {
      eventType: 'MASS_ASSIGNMENT_ATTEMPT_REGISTER',
      ip,
      userId: null
    });

    let { email, password, fullName, company, redirectTo } = whitelistedData;

    // 1. Sanitize and validate email
    email = sanitizeString(email, ip);
    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email must be at most 254 characters' }, { status: 400 });
    }

    // 2. Validate password strength (Fix 4: Password Strength Enforcement)
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    // 3. Sanitize other inputs
    fullName = sanitizeString(fullName, ip).slice(0, 100);
    company = sanitizeString(company, ip).slice(0, 200);

    // 4. Initiate Supabase signUp
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company: company,
          name: fullName,
          companyName: company
        },
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      await logSecurityEvent('REGISTRATION_FAILED', ip, null, {
        email,
        authError: error.message
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logSecurityEvent('REGISTRATION_SUCCESS', ip, data.user?.id || null, {
      email
    });

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      } : null
    });

  } catch (err: any) {
    console.error('Registration route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
