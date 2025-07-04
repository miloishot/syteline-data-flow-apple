/*
  # Complete Database Schema for IDO Data Extractor

  1. New Tables
    - `global_config` - Admin-managed global settings
    - `admin_users` - Admin role management
    - `user_profiles` - Extended user information
    - `jobs` - User job configurations
    - `api_configs` - Encrypted API credentials
    - `execution_history` - Complete audit trail
    - `user_settings` - User preferences
    - `export_data` - Shared/backup data storage

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Admin-only access to sensitive settings

  3. Functions and Triggers
    - Auto-update timestamps
    - Auto-create user profiles on signup
*/

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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  ido_name TEXT NOT NULL,
  query_params JSONB NOT NULL DEFAULT '{}',
  output_format TEXT NOT NULL DEFAULT 'csv',
  filterable_fields JSONB NOT NULL DEFAULT '[]',
  is_template BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_name)
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

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

-- Functions and Triggers (Create before enabling RLS)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE TRIGGER update_global_config_updated_at 
  BEFORE UPDATE ON global_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
  BEFORE UPDATE ON jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_configs_updated_at 
  BEFORE UPDATE ON api_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user signup
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_data ENABLE ROW LEVEL SECURITY;

-- Global Config Policies
CREATE POLICY "Public can read public global config" ON global_config
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage global config" ON global_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Admin Users Policies
CREATE POLICY "Admins can view admin users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- Jobs Policies
CREATE POLICY "Users can manage their own jobs" ON jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared job templates" ON jobs
  FOR SELECT USING (
    is_template = true AND is_shared = true
  );

-- API Configs Policies
CREATE POLICY "Users can manage their own API configs" ON api_configs
  FOR ALL USING (auth.uid() = user_id);

-- Execution History Policies
CREATE POLICY "Users can view their own execution history" ON execution_history
  FOR ALL USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can manage their own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Export Data Policies
CREATE POLICY "Users can manage their own exports" ON export_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared exports" ON export_data
  FOR SELECT USING (
    is_shared = true AND (expires_at IS NULL OR expires_at > NOW())
  );

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

-- Insert default job template
INSERT INTO jobs (
  id,
  user_id,
  job_name,
  ido_name,
  query_params,
  output_format,
  filterable_fields,
  is_template,
  is_shared
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user
  'Staging_Area_Label',
  'OPSIT_RS_QCInspIps',
  '{"properties": "Name,Lot,rcvd_qty,CreateDate,Item,TransDate,u_m,itmDescription,Job,overview", "recordCap": 100}',
  'csv',
  '[
    {
      "name": "Lot",
      "prompt": "Select Lot",
      "type": "string",
      "operator": "=",
      "input_type": "dropdown",
      "cache_duration": 300
    },
    {
      "name": "Item",
      "prompt": "Select Item code",
      "type": "string",
      "operator": "=",
      "input_type": "dropdown",
      "cache_duration": 300
    },
    {
      "name": "TransDate",
      "prompt": "Select Transaction Date",
      "type": "date",
      "operator": ">=",
      "input_type": "calendar"
    }
  ]',
  true,
  true
) ON CONFLICT (user_id, job_name) DO NOTHING;