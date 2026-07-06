import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { sanitizeString, validateEmail } from '@/app/lib/validation';
import { logSecurityEvent, validateNonceAndTimestamp } from '@/app/lib/security';

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
    let { email, password, fullName, company, redirectTo } = body;

    // 1. Sanitize and validate email
    email = sanitizeString(email, ip);
    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email must be at most 254 characters' }, { status: 400 });
    }

    // 2. Validate password length (Fix 4: LPDoS)
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Password must be between 8 and 72 characters' }, { status: 400 });
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
