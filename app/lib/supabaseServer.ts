import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (uses anon key — auth sessions not available server-side here)
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}