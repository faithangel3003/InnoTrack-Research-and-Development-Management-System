USE innotrack;

-- Deterministic IDs for local dev
SET @super_admin_id = '00000000-0000-0000-0000-000000000001';
SET @org_id = '00000000-0000-0000-0000-000000000010';
SET @project_id = '00000000-0000-0000-0000-000000000100';

INSERT INTO organizations (id, name, plan, active)
VALUES (@org_id, 'InnoTrack Platform', 'enterprise', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), plan = VALUES(plan), active = VALUES(active);

INSERT INTO app_users (id, email, password_hash, is_active)
VALUES (@super_admin_id, 'superadmin@innotrack.local', NULL, 1)
ON DUPLICATE KEY UPDATE email = VALUES(email), is_active = VALUES(is_active);

INSERT INTO profiles (id, full_name, organization_id)
VALUES (@super_admin_id, 'Super Administrator', @org_id)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), organization_id = VALUES(organization_id);

INSERT IGNORE INTO user_roles (id, user_id, organization_id, role)
VALUES (UUID(), @super_admin_id, @org_id, 'super_admin');

INSERT INTO projects (id, organization_id, name, description, objective, status, priority, lifecycle_stage, created_by)
VALUES (
  @project_id,
  @org_id,
  'InnoTrack Platform Hardening',
  'Stabilize control plane operations',
  'Improve reliability and governance coverage',
  'Active',
  'High',
  'Testing',
  @super_admin_id
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  objective = VALUES(objective),
  status = VALUES(status),
  priority = VALUES(priority),
  lifecycle_stage = VALUES(lifecycle_stage);

INSERT INTO activity_logs (id, actor_id, user_id, org_id, action, entity_type, entity_id, severity)
VALUES (UUID(), @super_admin_id, @super_admin_id, @org_id, 'seed.initialized', 'system', @org_id, 'info');
