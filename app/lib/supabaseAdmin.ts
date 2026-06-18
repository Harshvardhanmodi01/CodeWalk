import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // must be set in .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export { supabaseAdmin };