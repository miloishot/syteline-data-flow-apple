-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Global Configuration Table (Admin managed)
CREATE TABLE IF NOT EXISTS global_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs Configuration Table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  ido_name TEXT NOT NULL,
  query_params JSONB NOT NULL DEFAULT '{}',
  output_format TEXT NOT NULL DEFAULT 'csv',
  filterable_fields JSONB NOT NULL DEFAULT '[]',
  is_template BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on user_id and job_name for jobs table
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_user_job ON jobs(user_id, job_name);

-- API Configurations Table (encrypted)
CREATE TABLE IF NOT EXISTS api_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  encrypted_config TEXT NOT NULL,
  base_url TEXT NOT NULL,
  username TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Execution History Table
CREATE TABLE IF NOT EXISTS execution_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  filters_applied JSONB,
  record_count INTEGER,
  file_path TEXT,
  status TEXT CHECK (status IN ('success', 'error', 'running')) DEFAULT 'running',
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for user settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_unique ON user_settings(user_id, setting_key);

-- Export Data Storage Table
CREATE TABLE IF NOT EXISTS export_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  export_data JSONB NOT NULL,
  metadata JSONB,
  file_size_bytes INTEGER,
  is_shared BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_data ENABLE ROW LEVEL SECURITY;

-- Insert default global configuration
INSERT INTO global_config (config_key, config_value, description, is_public) VALUES
('app_name', '"IDO Data Extractor"', 'Application name', true),
('app_version', '"1.0.0"', 'Application version', true),
('default_base_url', '"https://your-syteline-server.com"', 'Default SyteLine server URL', false),
('default_config_name', '"SL"', 'Default configuration name', false),
('max_record_cap', '10000', 'Maximum records per query', true),
('supported_formats', '["csv", "xlsx"]', 'Supported export formats', true),
('maintenance_mode', 'false', 'Application maintenance mode', true),
('user_registration_enabled', 'true', 'Allow new user registration', true),
('default_timeout', '30', 'Default API timeout in seconds', true),
('cache_duration', '300', 'Default cache duration in seconds', true)
ON CONFLICT (config_key) DO NOTHING;