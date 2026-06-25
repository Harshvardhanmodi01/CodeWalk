-- SQL DDL Script for Recruiter AI Interview Platform

-- 1. recruiters table
CREATE TABLE IF NOT EXISTS public.recruiters (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    github_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.recruiters(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    repo_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    timer_duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    code_snippet TEXT,
    file_path TEXT,
    line_start INTEGER,
    line_end INTEGER,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT CHECK (category IN ('frontend', 'backend', 'dsa', 'system-design')),
    order_index INTEGER NOT NULL
);

-- 5. answers table
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    answer_text TEXT,
    ai_score INTEGER CHECK (ai_score BETWEEN 1 AND 10),
    ai_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. session_reports table
CREATE TABLE IF NOT EXISTS public.session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    hire_recommendation TEXT CHECK (hire_recommendation IN ('hire', 'maybe', 'pass')),
    code_story_summary TEXT,
    total_questions INTEGER NOT NULL,
    completed_questions INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow recruiters to read/manage their own profiles
CREATE POLICY "Allow recruiters to read/manage their own profiles" 
ON public.recruiters FOR ALL TO authenticated USING (auth.uid() = id);

-- Allow authenticated users to manage candidates
CREATE POLICY "Allow authenticated users to manage candidates" 
ON public.candidates FOR ALL TO authenticated USING (true);

-- Allow recruiters to manage their own sessions
CREATE POLICY "Allow recruiters to manage their own sessions" 
ON public.sessions FOR ALL TO authenticated USING (auth.uid() = recruiter_id);

-- Allow public read access to active sessions for candidates
CREATE POLICY "Allow public read access to sessions" 
ON public.sessions FOR SELECT TO public USING (true);

-- Allow recruiters to manage questions
CREATE POLICY "Allow recruiters to manage questions" 
ON public.questions FOR ALL TO authenticated USING (true);

-- Allow public read of questions for candidate session
CREATE POLICY "Allow public read of questions" 
ON public.questions FOR SELECT TO public USING (true);

-- Allow recruiters to manage answers
CREATE POLICY "Allow recruiters to manage answers" 
ON public.answers FOR ALL TO authenticated USING (true);

-- Allow public to write answers (candidate submission notes) and read
CREATE POLICY "Allow public to write and read answers" 
ON public.answers FOR ALL TO public USING (true);

-- Allow recruiters to manage reports
CREATE POLICY "Allow recruiters to manage reports" 
ON public.session_reports FOR ALL TO authenticated USING (true);

-- Allow public read of reports
CREATE POLICY "Allow public read of reports" 
ON public.session_reports FOR SELECT TO public USING (true);
