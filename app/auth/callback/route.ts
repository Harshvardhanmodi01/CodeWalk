import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';

/**
 * OAuth Callback Route Handler
 *
 * Supabase redirects back here after a user signs in via GitHub or Google.
 * This route exchanges the one-time `code` from the URL for a session,
 * then redirects the user to the dashboard.
 *
 * The redirect URL registered in Supabase Dashboard must include:
 *   http://localhost:3000/auth/callback   (for local dev)
 *   https://<your-domain>/auth/callback  (for production)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // If OAuth provider returned an error, redirect to login with a message
  if (error) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('oauth_error', errorDescription ?? error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[OAuth Callback] Code exchange failed:', exchangeError.message);
      const loginUrl = new URL('/login', requestUrl.origin);
      loginUrl.searchParams.set('oauth_error', exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    // Successfully authenticated — redirect to dashboard (or `next` param)
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // No code and no error — something unexpected; send back to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
