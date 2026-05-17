USE innotrack;

-- Default local development credentials
-- Email: superadmin@innotrack.local
-- Password: Admin123!
UPDATE app_users
SET password_hash = '$2b$10$614I7rpdakYombMQaOIarO8ql6tRZRZUwlackI/.vYrIjDqr9qQk6'
WHERE id = '00000000-0000-0000-0000-000000000001';
