-- SQL migration for Position-Based Bulk Hiring System

-- 1. Create public.positions table
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    required_skills TEXT[] DEFAULT '{}',
    experience_level TEXT,
    department TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Alter candidates table to support positions and fit analysis
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS fit_score TEXT CHECK (fit_score IN ('best_fit', 'good_fit', 'possible_fit'));
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS matched_skills JSONB DEFAULT '{"matched": []}'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS missing_skills JSONB DEFAULT '{"missing": []}'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS folder_name TEXT;

-- 3. Create batch_jobs table for tracking bulk question generation
CREATE TABLE IF NOT EXISTS public.batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES public.positions(id) ON DELETE CASCADE,
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    total_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Allow recruiters to manage their own positions" ON public.positions;
CREATE POLICY "Allow recruiters to manage their own positions" ON public.positions
  FOR ALL TO authenticated
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

DROP POLICY IF EXISTS "Allow recruiters to manage their own batch_jobs" ON public.batch_jobs;
CREATE POLICY "Allow recruiters to manage their own batch_jobs" ON public.batch_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
