-- Set up admin user for kw@city1.com (the active user)
INSERT INTO admin_users (user_id, role, permissions, created_by) 
VALUES (
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e',
  'super_admin',
  '{"manage_users": true, "manage_config": true, "manage_jobs": true, "view_analytics": true}',
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e'
);

-- Insert the API configuration
INSERT INTO api_configs (
  user_id,
  config_name,
  base_url,
  username,
  encrypted_config,
  is_default
) VALUES (
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e',
  'VGZWEX6TZNRG7XYH_TRN_NIHONMY',
  'https://csi10a.erpsl.ne1.inforcloudsuite.com',
  'kw_api_test',
  '{"config": "VGZWEX6TZNRG7XYH_TRN_NIHONMY", "password": "12345678", "timeout": 30, "retry_count": 3, "retry_delay": 1}',
  true
);

-- Add global configuration for API settings
INSERT INTO global_config (config_key, config_value, description, is_public, created_by)
VALUES 
(
  'default_api_timeout',
  '30',
  'Default API timeout in seconds',
  false,
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e'
),
(
  'default_retry_count', 
  '3',
  'Default number of API retry attempts',
  false,
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e'
),
(
  'default_retry_delay',
  '1', 
  'Default delay between retry attempts in seconds',
  false,
  '4efc0a81-ab40-44e6-8e9e-e9505fdd411e'
);