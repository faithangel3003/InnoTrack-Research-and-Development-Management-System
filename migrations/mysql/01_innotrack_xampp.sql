-- InnoTrack XAMPP/MariaDB migration
-- Generated from PostgreSQL migrations 01, 02, and 03
-- Target: MariaDB 10.4+ (XAMPP default)

CREATE DATABASE IF NOT EXISTS innotrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE innotrack;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS analytics_snapshots;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS org_module_settings;
DROP TABLE IF EXISTS system_modules;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS lifecycle_stage_history;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS organizations;

SET FOREIGN_KEY_CHECKS = 1;

-- Replacement for Supabase auth.users
CREATE TABLE app_users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE organizations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  plan ENUM('free', 'pro', 'enterprise') NOT NULL DEFAULT 'free',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_organizations_name (name),
  INDEX idx_organizations_active (active)
) ENGINE=InnoDB;

CREATE TABLE profiles (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255) NULL,
  avatar_url VARCHAR(500) NULL,
  organization_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_organization_id (organization_id),
  INDEX idx_profiles_full_name (full_name),
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  role ENUM('super_admin', 'system_admin', 'project_manager', 'team_member') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_roles_user_role_org (user_id, role, organization_id),
  INDEX idx_user_roles_user_id (user_id),
  INDEX idx_user_roles_organization_id (organization_id),
  INDEX idx_user_roles_role (role),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE projects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  objective TEXT NULL,
  status ENUM('Planning', 'Active', 'On Hold', 'Completed') NOT NULL DEFAULT 'Planning',
  priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  lifecycle_stage ENUM('Ideation', 'Research', 'Prototype', 'Testing', 'Launch', 'Post-Launch Review') NOT NULL DEFAULT 'Ideation',
  start_date DATE NULL,
  end_date DATE NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_projects_organization_id (organization_id),
  INDEX idx_projects_status (status),
  INDEX idx_projects_lifecycle_stage (lifecycle_stage),
  INDEX idx_projects_created_by (created_by),
  CONSTRAINT fk_projects_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE project_members (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role_in_project ENUM('Lead', 'Member', 'Viewer') NOT NULL DEFAULT 'Member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_members_project_user (project_id, user_id),
  INDEX idx_project_members_project_id (project_id),
  INDEX idx_project_members_user_id (user_id),
  CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_members_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  assignee_id CHAR(36) NULL,
  status ENUM('Backlog', 'In Progress', 'In Review', 'Done') NOT NULL DEFAULT 'Backlog',
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  due_date DATE NULL,
  parent_task_id CHAR(36) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_project_id (project_id),
  INDEX idx_tasks_assignee_id (assignee_id),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_parent_task_id (parent_task_id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_comments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  task_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_comments_task_id (task_id),
  INDEX idx_task_comments_user_id (user_id),
  CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NULL,
  size INT NULL,
  version INT NOT NULL DEFAULT 1,
  uploaded_by CHAR(36) NOT NULL,
  tags JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_project_id (project_id),
  INDEX idx_documents_uploaded_by (uploaded_by),
  CONSTRAINT fk_documents_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lifecycle_stage_history (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  stage ENUM('Ideation', 'Research', 'Prototype', 'Testing', 'Launch', 'Post-Launch Review') NOT NULL,
  entered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by CHAR(36) NULL,
  deliverables JSON NULL,
  approved_at TIMESTAMP NULL,
  INDEX idx_lifecycle_history_project_id (project_id),
  INDEX idx_lifecycle_history_stage (stage),
  CONSTRAINT fk_lifecycle_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_lifecycle_approved_by FOREIGN KEY (approved_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  type ENUM('task_assigned', 'comment', 'mention', 'stage_approved', 'document_shared') NOT NULL,
  payload JSON NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_read_at (read_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  actor_id CHAR(36) NULL,
  org_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id CHAR(36) NULL,
  metadata JSON NULL,
  ip_address VARCHAR(45) NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_actor_id (actor_id),
  INDEX idx_activity_logs_org_id (org_id),
  INDEX idx_activity_logs_action (action),
  INDEX idx_activity_logs_entity_type (entity_type),
  INDEX idx_activity_logs_severity (severity),
  INDEX idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_id) REFERENCES app_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_activity_logs_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE announcements (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title TEXT NOT NULL,
  body LONGTEXT NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  target_type ENUM('all', 'role', 'org') NOT NULL DEFAULT 'all',
  target_value VARCHAR(255) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP NULL,
  INDEX idx_announcements_created_at (created_at),
  INDEX idx_announcements_target_type (target_type),
  CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE system_modules (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  default_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE org_module_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  module_id CHAR(36) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by CHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_module (organization_id, module_id),
  CONSTRAINT fk_org_module_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_module_module FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_module_updated_by FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reports (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36) NOT NULL,
  generated_by CHAR(36) NULL,
  report_type VARCHAR(80) NOT NULL,
  payload JSON NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE analytics_snapshots (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36) NOT NULL,
  snapshot_date DATE NOT NULL,
  completion_rate DECIMAL(6,2) NULL,
  overdue_tasks INT NULL,
  document_count INT NULL,
  lifecycle_velocity DECIMAL(10,4) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_analytics_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed module list
INSERT INTO system_modules (id, code, name, description, default_enabled)
VALUES
  (UUID(), 'tracking', 'Project Tracking', 'Track projects, tasks, and deadlines', 1),
  (UUID(), 'lifecycle', 'Lifecycle Management', 'Manage product/research lifecycle stages', 1),
  (UUID(), 'docs', 'Documentation', 'Manage research files and documents', 1),
  (UUID(), 'collab', 'Collaboration', 'Messaging and team collaboration', 1),
  (UUID(), 'analytics', 'Innovation Analytics', 'Metrics and reporting', 1);

DELIMITER $$

CREATE FUNCTION has_role_global(p_user_id CHAR(36), p_required_role VARCHAR(50))
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_required_role
  );
END $$

CREATE FUNCTION has_role_in_org(p_user_id CHAR(36), p_required_role VARCHAR(50), p_org_id CHAR(36))
RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = p_required_role
      AND ur.organization_id = p_org_id
  );
END $$

DELIMITER ;

-- MariaDB does not support PostgreSQL RLS/policies; enforce access in application/service layer.
