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

  // 2. Existing Session & Route Protection
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
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
                headers: req.headers,
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
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users trying to access login/signup/register to dashboard
  const isAuthRoute = 
    path === '/login' || 
    path === '/signup' || 
    path === '/register';

  if (isAuthRoute && user) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};