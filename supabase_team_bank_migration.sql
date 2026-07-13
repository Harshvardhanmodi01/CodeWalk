-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by_email TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create team_questions table
CREATE TABLE IF NOT EXISTS public.team_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id TEXT NOT NULL, -- references question_bank.id or seed ID
    shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_questions ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Allow recruiters to manage invitations" ON public.team_invitations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for team_questions
CREATE POLICY "Allow recruiters to manage team questions" ON public.team_questions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
