import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client using @supabase/ssr.
 * Only call this from client components ('use client').
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton lazy instance for convenience in client components
let _client: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabase() {
  if (!_client) {
    _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

// Named export kept for backward compatibility — safe to use in 'use client' files only
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
