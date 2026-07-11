-- SQL MIGRATION FOR COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Table Policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);


-- 2. Sessions Table Policies
DROP POLICY IF EXISTS "sessions_all_policy" ON public.sessions;
CREATE POLICY "sessions_all_policy" ON public.sessions
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 3. Questions Table Policies
DROP POLICY IF EXISTS "questions_all_policy" ON public.questions;
CREATE POLICY "questions_all_policy" ON public.questions
  FOR ALL TO authenticated 
  USING (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid())) 
  WITH CHECK (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid()));


-- 4. Answers Table Policies
DROP POLICY IF EXISTS "answers_all_policy" ON public.answers;
CREATE POLICY "answers_all_policy" ON public.answers
  FOR ALL TO authenticated 
  USING (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid())) 
  WITH CHECK (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid()));


-- 5. Candidates Table Policies
DROP POLICY IF EXISTS "candidates_all_policy" ON public.candidates;
CREATE POLICY "candidates_all_policy" ON public.candidates
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 6. Positions Table Policies
DROP POLICY IF EXISTS "positions_all_policy" ON public.positions;
CREATE POLICY "positions_all_policy" ON public.positions
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 7. Question Bank Table Policies
DROP POLICY IF EXISTS "question_bank_select_prebuilt" ON public.question_bank;
CREATE POLICY "question_bank_select_prebuilt" ON public.question_bank
  FOR SELECT TO authenticated USING (created_by IS NULL);

DROP POLICY IF EXISTS "question_bank_select_custom" ON public.question_bank;
CREATE POLICY "question_bank_select_custom" ON public.question_bank
  FOR SELECT TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "question_bank_insert" ON public.question_bank;
CREATE POLICY "question_bank_insert" ON public.question_bank
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "question_bank_update" ON public.question_bank;
CREATE POLICY "question_bank_update" ON public.question_bank
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "question_bank_delete" ON public.question_bank;
CREATE POLICY "question_bank_delete" ON public.question_bank
  FOR DELETE TO authenticated USING (auth.uid() = created_by);


-- 8. Saved Questions Table Policies
DROP POLICY IF EXISTS "saved_questions_all_policy" ON public.saved_questions;
CREATE POLICY "saved_questions_all_policy" ON public.saved_questions
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 9. Candidate Events Table Policies
DROP POLICY IF EXISTS "candidate_events_all_policy" ON public.candidate_events;
CREATE POLICY "candidate_events_all_policy" ON public.candidate_events
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 10. Batch Jobs Table Policies
DROP POLICY IF EXISTS "batch_jobs_all_policy" ON public.batch_jobs;
CREATE POLICY "batch_jobs_all_policy" ON public.batch_jobs
  FOR ALL TO authenticated USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);


-- 11. Session Reports Table Policies
DROP POLICY IF EXISTS "session_reports_all_policy" ON public.session_reports;
CREATE POLICY "session_reports_all_policy" ON public.session_reports
  FOR ALL TO authenticated 
  USING (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid())) 
  WITH CHECK (session_id IN (SELECT s.id FROM public.sessions s WHERE s.recruiter_id = auth.uid()));


-- Reload schema cache
-- NOTIFY pgrst, 'reload schema';
