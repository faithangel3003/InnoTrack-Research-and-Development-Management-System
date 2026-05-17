-- InnoTrack RDMS module schema for XAMPP MySQL / MariaDB
CREATE DATABASE IF NOT EXISTS innotrack_rdms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE innotrack_rdms;

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS app_users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NULL,
  avatar_url VARCHAR(500) NULL,
  organization_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  role VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_role_scope (user_id, role, organization_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  objective TEXT NULL,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  lifecycle_stage VARCHAR(50) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_projects_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_user FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  actor_id CHAR(36) NULL,
  org_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id CHAR(36) NULL,
  metadata JSON NULL,
  severity VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Seed a super admin account (password: Admin123!)
INSERT INTO organizations (id, name, plan, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000010', 'InnoTrack Platform', 'enterprise', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP();

INSERT INTO app_users (id, email, password_hash, is_active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'superadmin@innotrack.local', '$2b$10$614I7rpdakYombMQaOIarO8ql6tRZRZUwlackI/.vYrIjDqr9qQk6', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP();

INSERT INTO profiles (id, full_name, organization_id, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Super Administrator', '00000000-0000-0000-0000-000000000010', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP();

INSERT INTO user_roles (id, user_id, organization_id, role, created_at)
VALUES (UUID(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'SuperAdmin', UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE created_at = created_at;
