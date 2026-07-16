-- SQL MIGRATION FOR ANTI-CHEATING AND PROCTORING SYSTEM
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Add recruiter_warning column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS recruiter_warning TEXT DEFAULT NULL;

-- 2. Create proctoring_events table
CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration_seconds INTEGER DEFAULT 0 NOT NULL,
    snapshot_url TEXT,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    recruiter_notified BOOLEAN DEFAULT false NOT NULL
);

-- 3. Create proctoring_summary table
CREATE TABLE IF NOT EXISTS public.proctoring_summary (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    total_tab_switches INTEGER DEFAULT 0 NOT NULL,
    total_face_not_visible_seconds INTEGER DEFAULT 0 NOT NULL,
    multiple_faces_count INTEGER DEFAULT 0 NOT NULL,
    copy_attempts INTEGER DEFAULT 0 NOT NULL,
    screen_sharing_interruptions INTEGER DEFAULT 0 NOT NULL,
    overall_integrity_score INTEGER DEFAULT 100 CHECK (overall_integrity_score BETWEEN 0 AND 100) NOT NULL,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    live_status JSONB DEFAULT '{"webcam": "active", "screenShare": "active", "tabFocus": "focused", "faceVisible": true}'::jsonb NOT NULL,
    recruiter_notes TEXT,
    proctoring_decision TEXT DEFAULT 'pending' CHECK (proctoring_decision IN ('clean', 'flagged', 'pending')) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_summary ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow recruiters to read proctoring_events" ON public.proctoring_events;
DROP POLICY IF EXISTS "Allow recruiters to read proctoring_summary" ON public.proctoring_summary;

-- 6. Create Select Policies (Only recruiter who owns the session can view its proctoring data)
CREATE POLICY "Allow recruiters to read proctoring_events" ON public.proctoring_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = proctoring_events.session_id AND s.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Allow recruiters to read proctoring_summary" ON public.proctoring_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = proctoring_summary.session_id AND s.recruiter_id = auth.uid()
    )
  );

-- 7. Initialize Storage Buckets for Proctoring
-- Note: Inserts into storage.buckets are required to register new buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('proctoring-snapshots', 'proctoring-snapshots', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('screen-recordings', 'screen-recordings', false, 52428800, ARRAY['video/webm'])
ON CONFLICT (id) DO NOTHING;

-- 8. Enable Storage RLS Policies
-- Recruiters can read snapshots and screen recordings from sessions they own
DROP POLICY IF EXISTS "Allow recruiter read access to proctoring-snapshots" ON storage.objects;
CREATE POLICY "Allow recruiter read access to proctoring-snapshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    (bucket_id = 'proctoring-snapshots' OR bucket_id = 'screen-recordings') AND
    (
      SELECT s.recruiter_id FROM public.sessions s 
      WHERE s.id::text = (storage.foldername(name))[1]
    ) = auth.uid()
  );

-- 9. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
