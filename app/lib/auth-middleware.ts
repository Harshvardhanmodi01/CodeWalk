import { createServerSupabaseClient } from './supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Authentication middleware helper for protected API routes.
 * Gets user details using request cookies. If authentication fails,
 * returns a 401 NextResponse. If successful, returns the user object.
 */
export async function requireAuth(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first to access this resource.' },
        { status: 401 }
      );
    }

    return user;
  } catch (err) {
    console.error('requireAuth helper error:', err);
    return NextResponse.json(
      { error: 'Unauthorized. Please login first to access this resource.' },
      { status: 401 }
    );
  }
}
