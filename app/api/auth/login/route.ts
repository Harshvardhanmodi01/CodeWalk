import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { sanitizeString, validateEmail } from '@/app/lib/validation';
import {
  checkLoginLockout,
  recordLoginAttempt,
  logSecurityEvent,
  generateCaptcha,
  verifyCaptcha,
  validateNonceAndTimestamp
} from '@/app/lib/security';

export async function POST(req: NextRequest) {
  // Get IP address
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
    let { email, password, captchaAnswer, captchaToken } = body;

    // 1. Basic validation & sanitization
    email = sanitizeString(email, ip);
    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Server-side password length limit (Fix 4: LPDoS)
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Password must be between 8 and 72 characters' }, { status: 400 });
    }

    // 2. Lockout and brute-force protection check
    const lockoutStatus = await checkLoginLockout(email, ip);
    if (lockoutStatus.blocked) {
      // Log blocked attempt
      await logSecurityEvent('LOGIN_BLOCKED_LOCKOUT', ip, null, {
        email,
        reason: lockoutStatus.reason,
        failedAttemptsCount: lockoutStatus.failedAttemptsCount
      }, 'critical');

      const statusCode = lockoutStatus.reason?.includes('IP') ? 403 : 429;
      return NextResponse.json({ error: lockoutStatus.reason }, { status: statusCode });
    }

    // 3. CAPTCHA enforcement (Fix 1: CAPTCHA trigger after 3 failed attempts)
    if (lockoutStatus.failedAttemptsCount >= 3) {
      const isCaptchaValid = verifyCaptcha(captchaToken, captchaAnswer);
      if (!isCaptchaValid) {
        const newCaptcha = generateCaptcha();
        
        await logSecurityEvent('LOGIN_CAPTCHA_FAILED', ip, null, {
          email,
          failedAttemptsCount: lockoutStatus.failedAttemptsCount
        }, 'warning');

        const remaining = 5 - lockoutStatus.failedAttemptsCount;
        return NextResponse.json({
          error: `Invalid or missing CAPTCHA. ${remaining} attempts remaining before lockout.`,
          requireCaptcha: true,
          captchaQuestion: newCaptcha.question,
          captchaToken: newCaptcha.captchaToken,
          attemptsRemaining: remaining
        }, { status: 400 });
      }
    }

    // 4. Authenticate user using server-side Supabase client (updates cookies)
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Record failed attempt
      await recordLoginAttempt(email, ip, false);
      
      await logSecurityEvent('LOGIN_FAILED', ip, null, {
        email,
        authError: error.message
      }, 'warning');

      // Get updated lockout status to determine new attempts state
      const updatedLockout = await checkLoginLockout(email, ip);
      const newFailedCount = updatedLockout.failedAttemptsCount;
      const remaining = Math.max(0, 5 - newFailedCount);

      if (newFailedCount >= 5) {
        return NextResponse.json({
          error: 'Too many failed attempts. Try again in 15 minutes.'
        }, { status: 429 });
      }

      if (newFailedCount >= 3) {
        const newCaptcha = generateCaptcha();
        return NextResponse.json({
          error: `Invalid credentials. ${remaining} attempts remaining before lockout.`,
          requireCaptcha: true,
          captchaQuestion: newCaptcha.question,
          captchaToken: newCaptcha.captchaToken,
          attemptsRemaining: remaining
        }, { status: 400 });
      }

      return NextResponse.json({
        error: `Invalid credentials. ${remaining} attempts remaining before lockout.`,
        attemptsRemaining: remaining
      }, { status: 400 });
    }

    // 5. Successful login
    const user = data.user;
    const session = data.session;

    // Record success (resets counter for this email)
    await recordLoginAttempt(email, ip, true);
    
    await logSecurityEvent('LOGIN_SUCCESS', ip, user?.id || null, {
      email
    }, 'info');

    return NextResponse.json({
      success: true,
      user,
      session: {
        access_token: session?.access_token,
        refresh_token: session?.refresh_token,
        expires_at: session?.expires_at
      }
    });

  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
