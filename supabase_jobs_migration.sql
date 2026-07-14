-- ============================================================
-- CodeWalk Platform — Jobs Table Migration
-- Run this in your Supabase Dashboard → SQL Editor
-- This table tracks BullMQ analysis jobs processed by the Railway worker.
-- ============================================================

-- 1. Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  repo_url    TEXT,
  result      JSONB,
  error       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 3. Service role (Railway worker) gets full access
DROP POLICY IF EXISTS "service_role_jobs_all" ON public.jobs;
CREATE POLICY "service_role_jobs_all" ON public.jobs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Authenticated users can read jobs (for polling from Vercel)
DROP POLICY IF EXISTS "authenticated_jobs_select" ON public.jobs;
CREATE POLICY "authenticated_jobs_select" ON public.jobs
  FOR SELECT TO authenticated
  USING (true);

-- 5. Authenticated users can insert new jobs (from /api/analyze)
DROP POLICY IF EXISTS "authenticated_jobs_insert" ON public.jobs;
CREATE POLICY "authenticated_jobs_insert" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. Index for fast status polling
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
