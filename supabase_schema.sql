-- SQL script to set up assessments and sync data in Supabase

CREATE TABLE IF NOT EXISTS public.assessments (
    id TEXT PRIMARY KEY, -- maps to client-side jobId (e.g. job_1782183541189)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    repo TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    questions_count INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    model TEXT,
    api_result JSONB,
    ratings JSONB DEFAULT '{}'::jsonb,
    notes JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own assessments
CREATE POLICY "Allow authenticated users to manage their own assessments" 
ON public.assessments 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
