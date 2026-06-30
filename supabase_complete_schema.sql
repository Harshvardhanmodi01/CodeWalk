-- COMPLETE DATABASE SCHEMA SETUP FOR CODEWALK PLATFORM

-- 1. Create public.profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    company_name TEXT,
    domain TEXT,
    industry TEXT,
    github_username TEXT,
    github_avatar TEXT,
    github_connected BOOLEAN DEFAULT false,
    tokens_reset_date TIMESTAMP WITH TIME ZONE,
    full_name TEXT,
    company TEXT,
    role TEXT DEFAULT 'HR / Recruiter',
    plan TEXT DEFAULT 'free',
    tokens_total INTEGER DEFAULT 5,
    tokens_used INTEGER DEFAULT 0,
    company_size TEXT,
    hires_per_month TEXT,
    referral_source TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    avatar_url TEXT,
    github_repos TEXT[] DEFAULT '{}',
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create public.candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    github_url TEXT NOT NULL,
    linkedin_url TEXT,
    role_applied TEXT,
    status TEXT DEFAULT 'pending',
    tech_stack TEXT[] DEFAULT '{}',
    years_experience TEXT,
    current_title TEXT,
    resume_url TEXT,
    resume_extracted_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    overall_score INTEGER,
    hire_recommendation TEXT,
    imported_via TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create public.sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    repo_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
    timer_duration_minutes INTEGER NOT NULL,
    remaining_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create public.questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    code_snippet TEXT,
    file_path TEXT,
    line_start INTEGER,
    line_end INTEGER,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT CHECK (category IN ('frontend', 'backend', 'dsa', 'system-design', 'behavioral')),
    order_index INTEGER NOT NULL,
    expected_answer TEXT,
    show_expected_answer BOOLEAN DEFAULT false,
    question_type TEXT DEFAULT 'code-based',
    why_asked TEXT
);

-- 5. Create public.answers table
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    answer_text TEXT,
    ai_score INTEGER,
    ai_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create public.session_reports table
CREATE TABLE IF NOT EXISTS public.session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    hire_recommendation TEXT CHECK (hire_recommendation IN ('hire', 'maybe', 'pass')),
    code_story_summary TEXT,
    total_questions INTEGER NOT NULL,
    completed_questions INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Profiles Policies
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Candidates Policies
DROP POLICY IF EXISTS "Allow recruiters to manage their own candidates" ON public.candidates;
CREATE POLICY "Allow recruiters to manage their own candidates" ON public.candidates
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);

-- Sessions Policies
DROP POLICY IF EXISTS "Allow recruiters to manage their own sessions" ON public.sessions;
CREATE POLICY "Allow recruiters to manage their own sessions" ON public.sessions
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);

DROP POLICY IF EXISTS "Allow public read access to sessions" ON public.sessions;
CREATE POLICY "Allow public read access to sessions" ON public.sessions
  FOR SELECT TO public USING (true);

-- Questions Policies
DROP POLICY IF EXISTS "Allow recruiters to manage questions" ON public.questions;
CREATE POLICY "Allow recruiters to manage questions" ON public.questions
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
CREATE POLICY "Allow public read access to questions" ON public.questions
  FOR SELECT TO public USING (true);

-- Answers Policies
DROP POLICY IF EXISTS "Allow recruiters to manage answers" ON public.answers;
CREATE POLICY "Allow recruiters to manage answers" ON public.answers
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read and write access to answers" ON public.answers;
CREATE POLICY "Allow public read and write access to answers" ON public.answers
  FOR ALL TO public USING (true);

-- Session Reports Policies
DROP POLICY IF EXISTS "Allow recruiters to manage reports" ON public.session_reports;
CREATE POLICY "Allow recruiters to manage reports" ON public.session_reports
  FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read of reports" ON public.session_reports;
CREATE POLICY "Allow public read of reports" ON public.session_reports
  FOR SELECT TO public USING (true);

-- 9. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
