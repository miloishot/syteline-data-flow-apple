-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user configurations table for encrypted API settings
CREATE TABLE public.user_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    salt TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, username)
);

-- Create jobs table for storing job definitions
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_name TEXT NOT NULL,
    ido_name TEXT NOT NULL,
    query_params JSONB NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'csv',
    filterable_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, job_name)
);

-- Enable RLS on tables
ALTER TABLE public.user_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_configurations
CREATE POLICY "Users can view their own configurations" 
ON public.user_configurations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own configurations" 
ON public.user_configurations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configurations" 
ON public.user_configurations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configurations" 
ON public.user_configurations FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for jobs
CREATE POLICY "Users can view their own jobs" 
ON public.jobs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
ON public.jobs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
ON public.jobs FOR DELETE 
USING (auth.uid() = user_id);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_configurations_updated_at
    BEFORE UPDATE ON public.user_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();