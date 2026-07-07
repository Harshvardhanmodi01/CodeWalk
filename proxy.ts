/**
 * MANUAL SUPABASE DASHBOARD CONFIGURATION (Fix 6):
 * 1. Navigate to your Supabase Project Settings > Authentication.
 * 2. Set "JWT Expiry" (access_token lifespan) to 3600 seconds (1 hour).
 * 3. Under "Session Settings", toggle "Enable Refresh Token Rotation" to ON.
 * 4. Client-side authentication tokens are kept in HttpOnly cookies by @supabase/ssr.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const limiters = new Map<string, RateLimitRecord>();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUUID(uuid: string) {
  return uuidRegex.test(uuid);
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // 1. Rate Limiting for API routes
  if (path.startsWith('/api')) {
    let limit = 30; // default for all other /api/* routes
    let routeType = 'other';

    if (path.startsWith('/api/auth/')) {
      limit = 5;
      routeType = 'auth';
    } else if (path.startsWith('/api/questions/')) {
      limit = 20;
      routeType = 'questions';
    } else if (path.startsWith('/api/admin/')) {
      limit = 2;
      routeType = 'admin';
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               (req as any).ip ||
               '127.0.0.1';

    const key = `${ip}:${routeType}`;
    const now = Date.now();
    const record = limiters.get(key);

    if (!record || now > record.resetTime) {
      limiters.set(key, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      });
    } else if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          }
        }
      );
    } else {
      record.count++;
    }
  }

  // Generate CSP nonce for HTML requests
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const scriptSrc = isDev 
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' blob:` 
    : `'self' 'nonce-${nonce}' blob:`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc} https://www.googletagmanager.com https://www.google-analytics.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: https://www.google-analytics.com https://www.googletagmanager.com;
    connect-src 'self' https://*.supabase.co https://api.groq.com ws: wss: https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // 2. Existing Session & Route Protection
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Use getUser() as it is secure and checks session validity
  const { data: { user } } = await supabase.auth.getUser();

  // Protect recruiter routes
  const isProtectedRoute = 
    path.startsWith('/dashboard') ||
    path.startsWith('/session') ||
    path.startsWith('/history') ||
    path.startsWith('/profile') ||
    path.startsWith('/tokens');

  // Except candidate routes!
  const isCandidateRoute = path.startsWith('/candidate');

  if (isProtectedRoute && !isCandidateRoute) {
    if (!user) {
      url.pathname = '/login';
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.headers.set('Content-Security-Policy', cspHeader);
      return redirectResponse;
    }
  }

  // Redirect authenticated users trying to access login/signup/register to dashboard
  const isAuthRoute = 
    path === '/login' || 
    path === '/signup' || 
    path === '/register';

  if (isAuthRoute && user) {
    url.pathname = '/dashboard';
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set('Content-Security-Policy', cspHeader);
    return redirectResponse;
  }

  // IDOR Protection for Frontend pages (Fix 2)
  if (user) {
    const parts = path.split('/');
    
    // Protect `/session/[sessionId]` (recruiter route)
    if (path.startsWith('/session/') && parts[2]) {
      const sessionId = parts[2];
      if (validateUUID(sessionId)) {
        // Query sessions via client to verify ownership (RLS handles this)
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('recruiter_id')
          .eq('id', sessionId)
          .maybeSingle();

        if (!sessionData) {
          url.pathname = '/dashboard';
          url.searchParams.set('error', 'Access denied');
          const redirectResponse = NextResponse.redirect(url);
          redirectResponse.headers.set('Content-Security-Policy', cspHeader);
          return redirectResponse;
        }
      }
    }

    // Protect `/candidates/[candidateId]` (recruiter route)
    if (path.startsWith('/candidates/') && parts[2]) {
      const candidateId = parts[2];
      if (validateUUID(candidateId)) {
        const { data: candidateData } = await supabase
          .from('candidates')
          .select('recruiter_id')
          .eq('id', candidateId)
          .maybeSingle();

        if (!candidateData) {
          url.pathname = '/candidates';
          url.searchParams.set('error', 'Access denied');
          const redirectResponse = NextResponse.redirect(url);
          redirectResponse.headers.set('Content-Security-Policy', cspHeader);
          return redirectResponse;
        }
      }
    }
  }

  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};