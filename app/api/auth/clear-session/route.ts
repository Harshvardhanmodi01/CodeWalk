import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/clear-session
 *
 * Clears all stale Supabase auth cookie chunks from the browser.
 * This resolves the "@supabase/ssr: chunked cookie decoded to invalid JSON"
 * error caused by corrupted sb-*-auth-token.* chunks left over from a
 * previous session or server restart.
 *
 * After clearing, redirects to /login so the user can sign in fresh.
 */
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));

  // Clear every sb-* cookie chunk (the pattern Supabase SSR uses)
  req.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-')) {
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/',
      });
    }
  });

  return response;
}
