import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
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

  const url = req.nextUrl.clone();
  const path = url.pathname;

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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};