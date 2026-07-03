-- SQL MIGRATION FOR QUESTION BANK IMPROVEMENTS
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Alter question_bank table to add new columns if they do not exist
ALTER TABLE public.question_bank 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS avg_score NUMERIC DEFAULT 0.0;

-- 2. Create saved_questions table
CREATE TABLE IF NOT EXISTS public.saved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(recruiter_id, question_id)
);

-- 3. Enable Row Level Security (RLS) on saved_questions
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS select_saved_questions ON public.saved_questions;
DROP POLICY IF EXISTS insert_saved_questions ON public.saved_questions;
DROP POLICY IF EXISTS delete_saved_questions ON public.saved_questions;

-- 5. Create RLS Policies for saved_questions
-- Recruiter can only select their own saved questions
CREATE POLICY select_saved_questions ON public.saved_questions
  FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid());

-- Recruiter can only insert saved questions pointing to their own account
CREATE POLICY insert_saved_questions ON public.saved_questions
  FOR INSERT TO authenticated
  WITH CHECK (recruiter_id = auth.uid());

-- Recruiter can only delete their own saved questions
CREATE POLICY delete_saved_questions ON public.saved_questions
  FOR DELETE TO authenticated
  USING (recruiter_id = auth.uid());

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
