-- Create login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    success BOOLEAN NOT NULL
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_id UUID,
    details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Note: Because we want these tables to be only accessible from the server-side (using the service role key),
-- we do NOT define any SELECT, INSERT, UPDATE, or DELETE policies for public/authenticated users.
-- This ensures that only the service_role key (which bypasses RLS) can access or modify these tables.
