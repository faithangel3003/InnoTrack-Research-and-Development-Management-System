-- InnoTrack: Phase 2 - Row-Level Security & RBAC
-- This migration sets up RLS policies and the has_role() security definer function

-- ============================================================================
-- HELPER FUNCTION: has_role()
-- ============================================================================
-- This SECURITY DEFINER function checks if a user has a specific role in an org
-- Used by all RLS policies to enforce role-based access control

CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role app_role, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1
      AND user_roles.role = $2
      AND user_roles.organization_id = $3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_role(UUID, app_role, UUID) TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: get_user_org()
-- ============================================================================
-- Returns the organization_id for the current user

CREATE OR REPLACE FUNCTION get_user_org()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_org() TO authenticated;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Super Admin can view all organizations
CREATE POLICY "super_admin_view_all_orgs" ON organizations
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role, get_user_org())
  );

-- Super Admin can update any organization
CREATE POLICY "super_admin_update_orgs" ON organizations
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role, get_user_org())
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role, get_user_org())
  );

-- Users can view their own organization
CREATE POLICY "users_view_own_org" ON organizations
  FOR SELECT
  USING (
    id = get_user_org()
  );

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

-- Users can view profiles in their organization
CREATE POLICY "users_view_org_profiles" ON profiles
  FOR SELECT
  USING (
    organization_id = get_user_org()
  );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- System Admin can update any profile in their org
CREATE POLICY "system_admin_update_profiles" ON profiles
  FOR UPDATE
  USING (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  )
  WITH CHECK (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  );

-- ============================================================================
-- USER ROLES RLS POLICIES
-- ============================================================================

-- System Admin can view roles in their org
CREATE POLICY "system_admin_view_roles" ON user_roles
  FOR SELECT
  USING (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  );

-- Super Admin can view all roles
CREATE POLICY "super_admin_view_all_roles" ON user_roles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role, get_user_org())
  );

-- System Admin can insert roles in their org
CREATE POLICY "system_admin_create_roles" ON user_roles
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  );

-- System Admin can update roles in their org
CREATE POLICY "system_admin_update_roles" ON user_roles
  FOR UPDATE
  USING (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  )
  WITH CHECK (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  );

-- System Admin can delete roles in their org
CREATE POLICY "system_admin_delete_roles" ON user_roles
  FOR DELETE
  USING (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
  );

-- ============================================================================
-- PROJECTS RLS POLICIES
-- ============================================================================

-- Users in org can view projects (org-scoped)
CREATE POLICY "users_view_org_projects" ON projects
  FOR SELECT
  USING (
    organization_id = get_user_org()
  );

-- Project lead can update the project
CREATE POLICY "project_lead_update_projects" ON projects
  FOR UPDATE
  USING (
    organization_id = get_user_org()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    organization_id = get_user_org()
    AND created_by = auth.uid()
  );

-- Project managers can create projects
CREATE POLICY "project_manager_create_projects" ON projects
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_org()
    AND has_role(auth.uid(), 'project_manager'::app_role, get_user_org())
  );

-- Project lead can delete (archive) projects
CREATE POLICY "project_lead_delete_projects" ON projects
  FOR DELETE
  USING (
    organization_id = get_user_org()
    AND created_by = auth.uid()
  );

-- ============================================================================
-- PROJECT MEMBERS RLS POLICIES
-- ============================================================================

-- Project members can view team (within their project)
CREATE POLICY "project_members_view_members" ON project_members
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = get_user_org()
    )
  );

-- Project lead can add members
CREATE POLICY "project_lead_add_members" ON project_members
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- Project lead can remove members
CREATE POLICY "project_lead_remove_members" ON project_members
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- ============================================================================
-- TASKS RLS POLICIES
-- ============================================================================

-- Project members can view tasks
CREATE POLICY "project_members_view_tasks" ON tasks
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = get_user_org()
    )
  );

-- Assignee or project lead can update task status
CREATE POLICY "task_assigned_or_lead_update_tasks" ON tasks
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organization_id = get_user_org()
        AND (p.created_by = auth.uid() OR tasks.assignee_id = auth.uid())
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.organization_id = get_user_org()
        AND (p.created_by = auth.uid() OR tasks.assignee_id = auth.uid())
    )
  );

-- Project lead can create tasks
CREATE POLICY "project_lead_create_tasks" ON tasks
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- Project lead can delete tasks
CREATE POLICY "project_lead_delete_tasks" ON tasks
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- ============================================================================
-- TASK COMMENTS RLS POLICIES
-- ============================================================================

-- Project members can view comments
CREATE POLICY "project_members_view_comments" ON task_comments
  FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id = get_user_org()
      )
    )
  );

-- Project members can create comments
CREATE POLICY "project_members_create_comments" ON task_comments
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT id FROM projects WHERE organization_id = get_user_org()
      )
    )
  );

-- Comment author can update their comment
CREATE POLICY "comment_author_update_comments" ON task_comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Comment author can delete their comment
CREATE POLICY "comment_author_delete_comments" ON task_comments
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- DOCUMENTS RLS POLICIES
-- ============================================================================

-- Project members can view documents
CREATE POLICY "project_members_view_documents" ON documents
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = get_user_org()
    )
  );

-- Project members can upload documents
CREATE POLICY "project_members_upload_documents" ON documents
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = get_user_org()
    )
  );

-- Document uploader can update their document
CREATE POLICY "uploader_update_documents" ON documents
  FOR UPDATE
  USING (
    uploaded_by = auth.uid()
  )
  WITH CHECK (
    uploaded_by = auth.uid()
  );

-- Document uploader can delete their document
CREATE POLICY "uploader_delete_documents" ON documents
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
  );

-- ============================================================================
-- LIFECYCLE STAGE HISTORY RLS POLICIES
-- ============================================================================

-- Project members can view lifecycle history
CREATE POLICY "project_members_view_lifecycle" ON lifecycle_stage_history
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id = get_user_org()
    )
  );

-- Project lead can create stage transitions
CREATE POLICY "project_lead_create_lifecycle" ON lifecycle_stage_history
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- Project lead can approve stages
CREATE POLICY "project_lead_approve_stages" ON lifecycle_stage_history
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = get_user_org()
        AND created_by = auth.uid()
    )
  );

-- ============================================================================
-- NOTIFICATIONS RLS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "users_view_own_notifications" ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================================
-- ACTIVITY LOGS RLS POLICIES
-- ============================================================================

-- System Admin can view org activity logs
CREATE POLICY "system_admin_view_activity_logs" ON activity_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'system_admin'::app_role, get_user_org())
    AND user_id IN (
      SELECT id FROM auth.users WHERE id IN (
        SELECT user_id FROM user_roles WHERE organization_id = get_user_org()
      )
    )
  );

-- Super Admin can view all activity logs
CREATE POLICY "super_admin_view_all_activity_logs" ON activity_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role, get_user_org())
  );

-- System grants for audit trail insertion (via trigger/function)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON activity_logs TO authenticated;

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================
-- Automatically logs all INSERT/UPDATE/DELETE actions to activity_logs

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
  entity_id_val UUID;
  action_val activity_action;
  entity_type_val entity_type_enum;
BEGIN
  -- Determine action
  CASE TG_OP
    WHEN 'INSERT' THEN
      action_val := 'create'::activity_action;
      entity_id_val := NEW.id;
    WHEN 'UPDATE' THEN
      action_val := 'update'::activity_action;
      entity_id_val := NEW.id;
    WHEN 'DELETE' THEN
      action_val := 'delete'::activity_action;
      entity_id_val := OLD.id;
  END CASE;

  -- Determine entity type
  CASE TG_TABLE_NAME
    WHEN 'projects' THEN entity_type_val := 'project'::entity_type_enum;
    WHEN 'tasks' THEN entity_type_val := 'task'::entity_type_enum;
    WHEN 'documents' THEN entity_type_val := 'document'::entity_type_enum;
    WHEN 'task_comments' THEN entity_type_val := 'comment'::entity_type_enum;
    WHEN 'lifecycle_stage_history' THEN entity_type_val := 'stage'::entity_type_enum;
    WHEN 'user_roles' THEN entity_type_val := 'user_role'::entity_type_enum;
  END CASE;

  -- Insert audit log
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    created_at
  ) VALUES (
    COALESCE(auth.uid(), (CASE WHEN TG_OP = 'DELETE' THEN OLD.created_by ELSE NEW.created_by END)),
    action_val,
    entity_type_val,
    entity_id_val,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW)) ELSE NULL END,
    inet_client_addr(),
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ATTACH AUDIT TRIGGERS
-- ============================================================================

CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_task_comments AFTER INSERT OR UPDATE OR DELETE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_lifecycle_history AFTER INSERT OR UPDATE OR DELETE ON lifecycle_stage_history
  FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_activity();
