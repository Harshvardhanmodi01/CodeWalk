-- SQL Migration for Take Home Project Assignment System
-- Run this in your Supabase SQL Editor (https://supabase.com)

-- 1. Create public.take_home_projects table
CREATE TABLE IF NOT EXISTS public.take_home_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    project_title TEXT NOT NULL,
    project_description TEXT,
    tech_stack_required TEXT[] DEFAULT '{}'::text[],
    experience_level TEXT,
    difficulty TEXT CHECK (difficulty IN ('junior', 'mid', 'senior', 'lead')),
    duration_days INTEGER DEFAULT 3,
    deadline TIMESTAMP WITH TIME ZONE,
    evaluation_criteria JSONB DEFAULT '{}'::jsonb,
    project_brief TEXT,
    unique_requirements JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'submitted', 'evaluated')),
    submission_repo_url TEXT,
    submission_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    ai_analysis_score INTEGER,
    commit_history_score INTEGER,
    code_quality_score INTEGER,
    ai_detection_score INTEGER,
    feature_completion_score INTEGER,
    overall_project_score INTEGER,
    reminders_sent TEXT[] DEFAULT '{}'::text[],
    plagiarism_flagged BOOLEAN DEFAULT false,
    plagiarism_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.take_home_projects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Recruiters can manage all aspects of their own projects
DROP POLICY IF EXISTS "Allow recruiters to manage their own projects" ON public.take_home_projects;
CREATE POLICY "Allow recruiters to manage their own projects" ON public.take_home_projects
  FOR ALL TO authenticated
  USING (auth.uid() = recruiter_id)
  WITH CHECK (auth.uid() = recruiter_id);

-- Candidates (public) need to be able to read project details (select) by project ID
DROP POLICY IF EXISTS "Allow public read of projects by id" ON public.take_home_projects;
CREATE POLICY "Allow public read of projects by id" ON public.take_home_projects
  FOR SELECT TO public
  USING (true);

-- Candidates (public) need to be able to update submission details (update)
DROP POLICY IF EXISTS "Allow public update of submission details" ON public.take_home_projects;
CREATE POLICY "Allow public update of submission details" ON public.take_home_projects
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
