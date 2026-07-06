import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiting map.
const limiters = new Map<string, RateLimitRecord>();

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
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://*.supabase.co https://api.groq.com ws: wss:;
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

  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};