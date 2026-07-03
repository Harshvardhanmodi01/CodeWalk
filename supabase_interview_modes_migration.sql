-- SQL MIGRATION FOR INTERVIEW MODE SYSTEM
-- Execute these queries in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Add interview mode columns to public.sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS interview_mode TEXT DEFAULT 'technical' CHECK (interview_mode IN ('technical', 'behavioral', 'logical', 'fullstack', 'custom'));
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS mode_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS behavioral_scores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS logical_scores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS custom_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS section_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS weighted_overall_score INTEGER;

-- 2. Add options, expected_answer JSONB conversion, and shared_answer columns to public.questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options TEXT[] DEFAULT '{}';
ALTER TABLE public.questions ALTER COLUMN expected_answer TYPE JSONB USING expected_answer::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS shared_answer TEXT;

-- 3. Drop check constraint on questions.category to allow new subcategories
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_category_check;

-- 4. Notify schema reload
NOTIFY pgrst, 'reload schema';
