-- SQL MIGRATION FOR QUESTIONS TABLE CHECK CONSTRAINT
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

-- Drop the old constraint if it exists (check name might vary, so drop by name)
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_category_check;

-- Add updated check constraint to allow 'evolution' category
ALTER TABLE public.questions ADD CONSTRAINT questions_category_check 
  CHECK (category IN ('frontend', 'backend', 'dsa', 'system_design', 'behavioral', 'logical', 'custom', 'evolution'));
