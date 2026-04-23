-- Update existing admin to main_admin
UPDATE user_roles 
SET role = 'main_admin'::app_role 
WHERE user_id = '176d3779-1cf4-4b5e-8522-a67abf4c6528';