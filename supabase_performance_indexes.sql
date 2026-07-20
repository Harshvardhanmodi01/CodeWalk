-- SQL MIGRATION FOR DATABASE PERFORMANCE INDEXES
-- Run this script in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Profiles index
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON public.profiles(id);

-- 2. Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_recruiter 
ON public.sessions(recruiter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_status 
ON public.sessions(status, recruiter_id);

-- 3. Candidates indexes
CREATE INDEX IF NOT EXISTS idx_candidates_recruiter 
ON public.candidates(recruiter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_position 
ON public.candidates(position_id);

-- 4. Questions & Answers indexes
CREATE INDEX IF NOT EXISTS idx_questions_session 
ON public.questions(session_id);

CREATE INDEX IF NOT EXISTS idx_answers_session 
ON public.answers(session_id);

-- 5. Question bank indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_topic 
ON public.question_bank(topic, category);

CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty 
ON public.question_bank(difficulty, usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_saved_questions_recruiter 
ON public.saved_questions(recruiter_id);

-- 6. Proctoring events index
CREATE INDEX IF NOT EXISTS idx_proctoring_session 
ON public.proctoring_events(session_id, timestamp DESC);

-- 7. Update query planner statistics
ANALYZE;
