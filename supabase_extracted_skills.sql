-- Add extracted_skills column to positions table to cache job description parsed skills
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS extracted_skills JSONB;
