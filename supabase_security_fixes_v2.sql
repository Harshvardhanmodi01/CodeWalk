-- Supabase Security Migration v2

-- 1. Alter security_logs to add severity column
ALTER TABLE public.security_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'));

-- 2. Create password_history table if not exists (already verified to exist, but here for completeness)
CREATE TABLE IF NOT EXISTS public.password_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- 3. Create select policy for authenticated users to view only their own password history
DROP POLICY IF EXISTS "Allow users to read their own password history" ON public.password_history;
CREATE POLICY "Allow users to read their own password history" ON public.password_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Note: Password history inserts are handled via service role key from the API route handler,
-- so we do not define public INSERT, UPDATE, or DELETE policies for it.
