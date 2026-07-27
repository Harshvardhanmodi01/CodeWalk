-- SQL MIGRATION TO ADD REPO AUTHENTICITY COLUMNS TO SESSION_REPORTS
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

ALTER TABLE public.session_reports 
ADD COLUMN IF NOT EXISTS repo_authenticity_score INTEGER CHECK (repo_authenticity_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS repo_authenticity_flags TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS repo_authenticity_signals JSONB DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
