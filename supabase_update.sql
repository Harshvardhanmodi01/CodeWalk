-- SQL Updates for CodeWalk Platform
-- Execute these queries in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Create public.profiles table if it does not exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    company_name TEXT,
    company_size TEXT,
    domain TEXT,
    industry TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Add columns to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_total INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens_reset_date TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, date_trunc('month'::text, now() + '1 month'::interval)));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_connected BOOLEAN DEFAULT false;

-- 3. Add columns to public.sessions table for pause/resume timer controls
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER;

-- 4. Enable Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Establish proper RLS Policies on profiles table
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 6. Add columns to public.questions table for ideal answer storage and real-time sharing
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS expected_answer TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS show_expected_answer BOOLEAN DEFAULT false;

-- 7. Add github_repos column to public.profiles table for user-scoped connected repositories
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_repos TEXT[] DEFAULT '{}';

-- 8. Add onboarding and registration data columns to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hires_per_month TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 9. Create Supabase Storage bucket for avatars (run this in Dashboard SQL editor OR via API)
-- NOTE: Supabase Storage buckets cannot be created with pure SQL in older versions.
-- Use the Supabase Dashboard → Storage → "New bucket" named "avatars" with Public access ON.
-- Then apply these RLS policies:

-- Allow anyone to read avatar images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
