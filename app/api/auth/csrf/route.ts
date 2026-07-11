import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const existingToken = req.cookies.get('csrf_token')?.value;

    if (existingToken) {
      return NextResponse.json({ csrfToken: existingToken });
    }

    // Generate a secure random token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const response = NextResponse.json({ csrfToken });

    // Set token in HttpOnly cookie
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return response;
  } catch (err) {
    console.error('CSRF token route exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
