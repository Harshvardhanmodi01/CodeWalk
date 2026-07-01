-- SQL MIGRATION FOR DASHBOARD & PIPELINE ENHANCEMENTS
-- Execute these queries in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Alter sessions table to support scheduling, open tracking, and AI score breakdowns
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS link_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

-- Drop old status check constraint if it exists on sessions.status
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
-- Add new check constraint supporting 'scheduled'
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('active', 'completed', 'cancelled', 'scheduled'));

-- 2. Create candidate_events table for tracking communication timeline
CREATE TABLE IF NOT EXISTS public.candidate_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
      'imported', 
      'link_sent', 
      'link_opened', 
      'interview_started', 
      'interview_completed', 
      'report_generated', 
      'candidate_rejected', 
      'candidate_hired'
    )),
    event_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) on candidate_events
ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;

-- Allow recruiters to manage their own events
DROP POLICY IF EXISTS "Allow recruiters to manage their own events" ON public.candidate_events;
CREATE POLICY "Allow recruiters to manage their own events" ON public.candidate_events
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);

-- Allow public/anonymous inserts of events (needed for tracking email link opens, etc.)
DROP POLICY IF EXISTS "Allow public inserts of events" ON public.candidate_events;
CREATE POLICY "Allow public inserts of events" ON public.candidate_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
