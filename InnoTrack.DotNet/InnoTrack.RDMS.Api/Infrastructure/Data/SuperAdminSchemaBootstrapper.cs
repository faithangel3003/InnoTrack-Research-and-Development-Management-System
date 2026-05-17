using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Data;

public static class SuperAdminSchemaBootstrapper
{
    private const string DefaultOrganizationId = "00000000-0000-0000-0000-000000000010";
    private const string SuperAdminUserId = "00000000-0000-0000-0000-000000000001";
    private const string SystemAdminUserId = "00000000-0000-0000-0000-000000000002";
    private const string DefaultPasswordHash = "$2b$10$614I7rpdakYombMQaOIarO8ql6tRZRZUwlackI/.vYrIjDqr9qQk6";

    public static async Task InitializeAsync(IServiceProvider services, ILogger logger)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await EnsureOrganizationColumnsAsync(dbContext, logger);
        await EnsureTeamCompatibilityAsync(dbContext, logger);
        await EnsureProjectCompatibilityAsync(dbContext, logger);
        await EnsureRoleTableAsync(dbContext, logger);
        await SeedDefaultUsersAsync(dbContext, logger);
        await EnsureBillingTablesAsync(dbContext);
        await EnsureDocumentTablesAsync(dbContext, logger);
        await EnsureCollaborationTablesAsync(dbContext, logger);
        await EnsureSecurityTablesAsync(dbContext, logger);
        await SeedSubscriptionsFromOrganizationsAsync(dbContext);
        await EnsureSubscriptionBillingRecordsAsync(dbContext);
    }

    private static async Task EnsureOrganizationColumnsAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL DEFAULT ''",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL DEFAULT ''",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS team_id CHAR(36) NULL",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role_id INT NOT NULL DEFAULT 0",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) NOT NULL DEFAULT 'Approved'",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255) NULL",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_role VARCHAR(120) NULL",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry VARCHAR(120) NULL",
            "UPDATE organizations SET approval_status = 'Approved' WHERE approval_status IS NULL OR approval_status = ''",
            "UPDATE app_users u INNER JOIN profiles p ON p.id = u.id SET u.organization_id = p.organization_id WHERE u.organization_id IS NULL",
            @"UPDATE organizations o
              LEFT JOIN (
                  SELECT p.organization_id,
                         MIN(u.email) AS email,
                         MIN(COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email)) AS contact_person
                  FROM profiles p
                  INNER JOIN app_users u ON u.id = p.id
                  GROUP BY p.organization_id
              ) lookup ON lookup.organization_id = o.id
              SET o.email = COALESCE(o.email, lookup.email),
                  o.contact_person = COALESCE(o.contact_person, lookup.contact_person)
              WHERE lookup.organization_id IS NOT NULL"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring bootstrap statement failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureTeamCompatibilityAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS teams (
                id CHAR(36) PRIMARY KEY,
                organization_id CHAR(36) NOT NULL,
                name VARCHAR(150) NOT NULL,
                description VARCHAR(500) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uq_teams_org_name (organization_id, name),
                INDEX idx_teams_org (organization_id),
                CONSTRAINT fk_teams_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"UPDATE app_users u
              LEFT JOIN teams t ON t.id = u.team_id
              SET u.team_id = NULL
              WHERE u.team_id IS NOT NULL AND t.id IS NULL"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring team compatibility bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureRoleTableAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS roles (
                id INT PRIMARY KEY,
                role_name VARCHAR(64) NOT NULL,
                description VARCHAR(255) NOT NULL,
                UNIQUE KEY uq_roles_name (role_name)
            ) ENGINE=InnoDB",
            "INSERT INTO roles (id, role_name, description) VALUES (1, 'SuperAdmin', 'Platform-wide control') ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)",
            "INSERT INTO roles (id, role_name, description) VALUES (2, 'SystemAdmin', 'Manages organization users, settings, and services') ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)",
            "INSERT INTO roles (id, role_name, description) VALUES (3, 'ProjectManager', 'Manages projects and tasks') ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)",
            "INSERT INTO roles (id, role_name, description) VALUES (4, 'TeamMember', 'Updates assigned work') ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)",
            @"UPDATE app_users u
              LEFT JOIN (
                  SELECT user_id,
                         CASE
                             WHEN LOWER(REPLACE(REPLACE(role, ' ', ''), '_', '')) IN ('superadmin', 'superadministrator') THEN 1
                             WHEN LOWER(REPLACE(REPLACE(role, ' ', ''), '_', '')) IN ('systemadmin', 'systemadministrator', 'companyadmin', 'companyadministrator') THEN 2
                             WHEN LOWER(REPLACE(REPLACE(role, ' ', ''), '_', '')) = 'projectmanager' THEN 3
                             WHEN LOWER(REPLACE(REPLACE(role, ' ', ''), '_', '')) = 'teammember' THEN 4
                             ELSE NULL
                         END AS resolved_role_id
                  FROM user_roles
              ) resolved ON resolved.user_id = u.id
              SET u.role_id = COALESCE(resolved.resolved_role_id, u.role_id, 0)
              WHERE u.role_id IS NULL OR u.role_id = 0"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring role bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureProjectCompatibilityAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT ''",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_user_id CHAR(36) NULL",
            "ALTER TABLE project_members ADD COLUMN IF NOT EXISTS member_role VARCHAR(32) NOT NULL DEFAULT 'Contributor'",
            @"CREATE TABLE IF NOT EXISTS project_status_history (
                id CHAR(36) PRIMARY KEY,
                project_id CHAR(36) NOT NULL,
                changed_by_user_id CHAR(36) NOT NULL,
                old_status VARCHAR(50) NOT NULL,
                new_status VARCHAR(50) NOT NULL,
                changed_at DATETIME NOT NULL,
                remarks VARCHAR(500) NULL,
                INDEX idx_project_status_history_project (project_id),
                INDEX idx_project_status_history_changed_by (changed_by_user_id),
                CONSTRAINT fk_project_status_history_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CONSTRAINT fk_project_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS project_tasks (
                id CHAR(36) PRIMARY KEY,
                project_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                assigned_to_user_id CHAR(36) NOT NULL,
                assigned_by_user_id CHAR(36) NOT NULL,
                status VARCHAR(50) NOT NULL,
                priority VARCHAR(50) NOT NULL,
                due_date DATETIME NOT NULL,
                completed_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_project_tasks_project (project_id),
                INDEX idx_project_tasks_assigned_to (assigned_to_user_id),
                INDEX idx_project_tasks_assigned_by (assigned_by_user_id),
                CONSTRAINT fk_project_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CONSTRAINT fk_project_tasks_assigned_to FOREIGN KEY (assigned_to_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_project_tasks_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS task_comments (
                id CHAR(36) PRIMARY KEY,
                task_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                comment TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_task_comments_task (task_id),
                INDEX idx_task_comments_user (user_id),
                CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES project_tasks(id) ON DELETE CASCADE,
                CONSTRAINT fk_task_comments_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS milestones (
                id CHAR(36) PRIMARY KEY,
                project_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                due_date DATETIME NOT NULL,
                is_completed TINYINT(1) NOT NULL DEFAULT 0,
                completed_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_milestones_project (project_id),
                CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"UPDATE projects
              SET title = COALESCE(NULLIF(title, ''), name)
              WHERE title IS NULL OR title = ''",
            @"UPDATE projects
              SET title = 'Untitled Project'
              WHERE title IS NULL OR title = ''",
                        @"UPDATE projects
                            SET start_date = COALESCE(start_date, DATE(created_at))
                            WHERE start_date IS NULL",
                        @"UPDATE projects
                            SET end_date = COALESCE(end_date, DATE_ADD(COALESCE(start_date, DATE(created_at)), INTERVAL 30 DAY))
                            WHERE end_date IS NULL",
            $@"UPDATE projects
               SET created_by_user_id = COALESCE(created_by_user_id, created_by, '{SystemAdminUserId}')
               WHERE created_by_user_id IS NULL OR created_by_user_id = ''",
            $@"UPDATE projects
               SET created_by_user_id = '{SystemAdminUserId}'
               WHERE created_by_user_id IS NULL OR created_by_user_id = ''",
            @"UPDATE project_members
              SET member_role = CASE LOWER(role_in_project)
                  WHEN 'lead' THEN 'Lead'
                  WHEN 'member' THEN 'Contributor'
                  WHEN 'viewer' THEN 'Observer'
                  ELSE COALESCE(NULLIF(member_role, ''), 'Contributor')
              END
              WHERE member_role IS NULL OR member_role = ''"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring project compatibility bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task SeedDefaultUsersAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            $@"INSERT INTO app_users (id, first_name, last_name, email, password_hash, role_id, organization_id, is_active, created_at, updated_at)
               VALUES ('{SuperAdminUserId}', 'Super', 'Administrator', 'superadmin@innotrack.local', '{DefaultPasswordHash}', 1, '{DefaultOrganizationId}', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
               ON DUPLICATE KEY UPDATE
                 first_name = VALUES(first_name),
                 last_name = VALUES(last_name),
                 password_hash = COALESCE(app_users.password_hash, VALUES(password_hash)),
                      role_id = VALUES(role_id),
                      organization_id = VALUES(organization_id),
                 is_active = 1,
                 updated_at = UTC_TIMESTAMP()",
            $@"INSERT INTO profiles (id, full_name, organization_id, created_at, updated_at)
               VALUES ('{SuperAdminUserId}', 'Super Administrator', '{DefaultOrganizationId}', UTC_TIMESTAMP(), UTC_TIMESTAMP())
               ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), organization_id = VALUES(organization_id), updated_at = UTC_TIMESTAMP()",
                $@"DELETE FROM user_roles WHERE user_id = '{SuperAdminUserId}'",
                $@"INSERT INTO user_roles (id, user_id, organization_id, role, created_at)
                    VALUES (UUID(), '{SuperAdminUserId}', '{DefaultOrganizationId}', 'super_admin', UTC_TIMESTAMP())",
            $@"INSERT INTO app_users (id, first_name, last_name, email, password_hash, role_id, organization_id, is_active, created_at, updated_at)
               VALUES ('{SystemAdminUserId}', 'Company', 'Administrator', 'companyadmin@innotrack.local', '{DefaultPasswordHash}', 2, '{DefaultOrganizationId}', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
               ON DUPLICATE KEY UPDATE
                 first_name = VALUES(first_name),
                 last_name = VALUES(last_name),
                 password_hash = COALESCE(app_users.password_hash, VALUES(password_hash)),
                      role_id = VALUES(role_id),
                      organization_id = VALUES(organization_id),
                 is_active = 1,
                 updated_at = UTC_TIMESTAMP()",
            $@"INSERT INTO profiles (id, full_name, organization_id, created_at, updated_at)
               VALUES ('{SystemAdminUserId}', 'Company Administrator', '{DefaultOrganizationId}', UTC_TIMESTAMP(), UTC_TIMESTAMP())
               ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), organization_id = VALUES(organization_id), updated_at = UTC_TIMESTAMP()",
                $@"DELETE FROM user_roles WHERE user_id = '{SystemAdminUserId}'",
                $@"INSERT INTO user_roles (id, user_id, organization_id, role, created_at)
                    VALUES (UUID(), '{SystemAdminUserId}', '{DefaultOrganizationId}', 'system_admin', UTC_TIMESTAMP())"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring default user seed failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureBillingTablesAsync(AppDbContext dbContext)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS organization_subscriptions (
                id CHAR(36) PRIMARY KEY,
                organization_id CHAR(36) NOT NULL,
                plan VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NOT NULL,
                billing_cycle VARCHAR(20) NOT NULL,
                amount DECIMAL(18,2) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uq_org_subscription (organization_id),
                CONSTRAINT fk_org_subscription_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS payment_transactions (
                id CHAR(36) PRIMARY KEY,
                organization_id CHAR(36) NOT NULL,
                subscription_id CHAR(36) NULL,
                reference_number VARCHAR(80) NOT NULL,
                amount DECIMAL(18,2) NOT NULL DEFAULT 0,
                method VARCHAR(40) NOT NULL,
                status VARCHAR(40) NOT NULL,
                description TEXT NULL,
                billing_period_start DATETIME NULL,
                billing_period_end DATETIME NULL,
                gateway_message TEXT NULL,
                paid_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE KEY uq_payment_reference (reference_number),
                INDEX idx_payment_org (organization_id),
                INDEX idx_payment_status (status),
                INDEX idx_payment_paid_at (paid_at),
                CONSTRAINT fk_payment_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                CONSTRAINT fk_payment_subscription FOREIGN KEY (subscription_id) REFERENCES organization_subscriptions(id) ON DELETE SET NULL
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS pending_public_onboardings (
                id CHAR(36) PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                industry VARCHAR(120) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20) NULL,
                encrypted_password LONGTEXT NOT NULL,
                plan_id VARCHAR(50) NOT NULL,
                payment_method VARCHAR(40) NOT NULL,
                amount DECIMAL(18,2) NOT NULL DEFAULT 0,
                status VARCHAR(40) NOT NULL,
                paymongo_checkout_session_id VARCHAR(80) NULL,
                paymongo_checkout_url LONGTEXT NULL,
                paymongo_payment_id VARCHAR(80) NULL,
                paymongo_reference_number VARCHAR(80) NULL,
                gateway_message LONGTEXT NULL,
                paid_at DATETIME NULL,
                expires_at DATETIME NOT NULL,
                organization_id CHAR(36) NULL,
                admin_user_id CHAR(36) NULL,
                payment_reference VARCHAR(80) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_pending_onboarding_email (email),
                INDEX idx_pending_onboarding_status (status),
                INDEX idx_pending_onboarding_expires_at (expires_at),
                UNIQUE KEY uq_pending_onboarding_checkout_session (paymongo_checkout_session_id),
                UNIQUE KEY uq_pending_onboarding_payment_reference (payment_reference)
            ) ENGINE=InnoDB"
        };

        foreach (var statement in statements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement);
        }
    }

    private static async Task EnsureDocumentTablesAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS document_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                description VARCHAR(255) NULL,
                organization_id CHAR(36) NOT NULL,
                created_at DATETIME NOT NULL,
                UNIQUE KEY uq_document_category_org_name (organization_id, name),
                CONSTRAINT fk_document_category_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS document_tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(80) NOT NULL,
                organization_id CHAR(36) NOT NULL,
                UNIQUE KEY uq_document_tag_org_name (organization_id, name),
                CONSTRAINT fk_document_tag_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS documents (
                id CHAR(36) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                references_text TEXT NULL,
                file_name VARCHAR(255) NOT NULL,
                original_file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT NOT NULL,
                file_type VARCHAR(120) NOT NULL,
                file_extension VARCHAR(20) NOT NULL,
                project_id CHAR(36) NULL,
                category_id INT NULL,
                uploaded_by_user_id CHAR(36) NOT NULL,
                organization_id CHAR(36) NOT NULL,
                version INT NOT NULL DEFAULT 1,
                is_archived TINYINT(1) NOT NULL DEFAULT 0,
                deleted_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_document_org (organization_id),
                INDEX idx_document_project (project_id),
                INDEX idx_document_category (category_id),
                INDEX idx_document_uploader (uploaded_by_user_id),
                INDEX idx_document_archived (is_archived),
                CONSTRAINT fk_document_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                CONSTRAINT fk_document_category FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
                CONSTRAINT fk_document_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_document_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS references_text TEXT NULL",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_file_name VARCHAR(255) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(120) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_extension VARCHAR(20) NOT NULL DEFAULT ''",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id INT NULL",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_user_id CHAR(36) NULL",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL",
                        @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_archived TINYINT(1) NOT NULL DEFAULT 0",
            @"ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL",
                        @"ALTER TABLE documents MODIFY COLUMN project_id CHAR(36) NULL",
                        @"ALTER TABLE documents MODIFY COLUMN category_id INT NULL",
                        @"ALTER TABLE documents MODIFY COLUMN uploaded_by CHAR(36) NULL",
                        @"UPDATE documents
                            SET title = COALESCE(NULLIF(title, ''), NULLIF(name, ''), NULLIF(original_file_name, ''), NULLIF(file_name, ''), 'Untitled Document')
                            WHERE title IS NULL OR title = ''",
                        @"UPDATE documents
                            SET file_path = COALESCE(NULLIF(file_path, ''), NULLIF(storage_path, ''), '')
                            WHERE file_path IS NULL OR file_path = ''",
                        @"UPDATE documents
                            SET file_name = COALESCE(
                                        NULLIF(file_name, ''),
                                        NULLIF(original_file_name, ''),
                                        NULLIF(name, ''),
                                        NULLIF(SUBSTRING_INDEX(COALESCE(NULLIF(file_path, ''), NULLIF(storage_path, '')), '/', -1), ''),
                                        'document'
                                    )
                            WHERE file_name IS NULL OR file_name = ''",
                        @"UPDATE documents
                            SET original_file_name = COALESCE(NULLIF(original_file_name, ''), NULLIF(file_name, ''), NULLIF(name, ''), 'document')
                            WHERE original_file_name IS NULL OR original_file_name = ''",
                        @"UPDATE documents
                            SET file_size = COALESCE(file_size, size, 0)
                            WHERE file_size IS NULL",
                        @"UPDATE documents
                            SET file_type = COALESCE(NULLIF(file_type, ''), NULLIF(mime_type, ''), 'application/octet-stream')
                            WHERE file_type IS NULL OR file_type = ''",
                        @"UPDATE documents
                            SET file_extension = COALESCE(
                                        NULLIF(file_extension, ''),
                                        CASE
                                                WHEN LOCATE('.', COALESCE(NULLIF(original_file_name, ''), NULLIF(file_name, ''), NULLIF(name, ''))) > 0
                                                        THEN CONCAT('.', SUBSTRING_INDEX(COALESCE(NULLIF(original_file_name, ''), NULLIF(file_name, ''), NULLIF(name, '')), '.', -1))
                                                ELSE ''
                                        END
                                    )
                            WHERE file_extension IS NULL OR file_extension = ''",
                        $@"UPDATE documents
                             SET uploaded_by_user_id = COALESCE(uploaded_by_user_id, uploaded_by, '{SuperAdminUserId}')
                             WHERE uploaded_by_user_id IS NULL OR uploaded_by_user_id = ''",
                            @"UPDATE documents
                                SET uploaded_by = COALESCE(uploaded_by, uploaded_by_user_id)
                                WHERE uploaded_by IS NULL OR uploaded_by = ''",
                        $@"UPDATE documents d
                             LEFT JOIN projects p ON p.id = d.project_id
                             LEFT JOIN app_users u ON u.id = d.uploaded_by_user_id
                             SET d.organization_id = COALESCE(d.organization_id, p.organization_id, u.organization_id, '{DefaultOrganizationId}')
                             WHERE d.organization_id IS NULL OR d.organization_id = ''",
            @"CREATE TABLE IF NOT EXISTS document_versions (
                id CHAR(36) PRIMARY KEY,
                document_id CHAR(36) NOT NULL,
                version_number INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT NOT NULL,
                uploaded_by_user_id CHAR(36) NOT NULL,
                change_notes TEXT NULL,
                created_at DATETIME NOT NULL,
                UNIQUE KEY uq_document_version (document_id, version_number),
                CONSTRAINT fk_document_version_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                CONSTRAINT fk_document_version_user FOREIGN KEY (uploaded_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS document_tag_map (
                document_id CHAR(36) NOT NULL,
                tag_id INT NOT NULL,
                PRIMARY KEY (document_id, tag_id),
                CONSTRAINT fk_document_tag_map_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                CONSTRAINT fk_document_tag_map_tag FOREIGN KEY (tag_id) REFERENCES document_tags(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS document_access_logs (
                id CHAR(36) PRIMARY KEY,
                document_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                action VARCHAR(40) NOT NULL,
                accessed_at DATETIME NOT NULL,
                ip_address VARCHAR(45) NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_document_access_document (document_id),
                INDEX idx_document_access_user (user_id),
                INDEX idx_document_access_time (accessed_at),
                CONSTRAINT fk_document_access_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                CONSTRAINT fk_document_access_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring document bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureCollaborationTablesAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            @"CREATE TABLE IF NOT EXISTS channels (
                id CHAR(36) PRIMARY KEY,
                name VARCHAR(160) NOT NULL,
                description TEXT NULL,
                type VARCHAR(40) NOT NULL,
                project_id CHAR(36) NULL,
                organization_id CHAR(36) NOT NULL,
                created_by_user_id CHAR(36) NOT NULL,
                is_archived TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_channels_org (organization_id),
                INDEX idx_channels_project (project_id),
                INDEX idx_channels_type (type),
                INDEX idx_channels_archived (is_archived),
                CONSTRAINT fk_channels_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
                CONSTRAINT fk_channels_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                CONSTRAINT fk_channels_created_by FOREIGN KEY (created_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS channel_members (
                id CHAR(36) PRIMARY KEY,
                channel_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                role VARCHAR(32) NOT NULL,
                joined_at DATETIME NOT NULL,
                last_read_at DATETIME NULL,
                UNIQUE KEY uq_channel_member (channel_id, user_id),
                INDEX idx_channel_members_user (user_id),
                CONSTRAINT fk_channel_members_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                CONSTRAINT fk_channel_members_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS messages (
                id CHAR(36) PRIMARY KEY,
                channel_id CHAR(36) NOT NULL,
                sender_id CHAR(36) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(32) NOT NULL,
                parent_message_id CHAR(36) NULL,
                is_edited TINYINT(1) NOT NULL DEFAULT 0,
                edited_at DATETIME NULL,
                is_pinned TINYINT(1) NOT NULL DEFAULT 0,
                is_deleted TINYINT(1) NOT NULL DEFAULT 0,
                deleted_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_messages_channel (channel_id),
                INDEX idx_messages_sender (sender_id),
                INDEX idx_messages_parent (parent_message_id),
                INDEX idx_messages_pinned (is_pinned),
                INDEX idx_messages_created (created_at),
                CONSTRAINT fk_messages_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
                CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_messages_parent FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS message_attachments (
                id CHAR(36) PRIMARY KEY,
                message_id CHAR(36) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                original_file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT NOT NULL,
                file_type VARCHAR(120) NOT NULL,
                uploaded_at DATETIME NOT NULL,
                INDEX idx_message_attachments_message (message_id),
                CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS message_reactions (
                id CHAR(36) PRIMARY KEY,
                message_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at DATETIME NOT NULL,
                UNIQUE KEY uq_message_reaction (message_id, user_id, emoji),
                CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
                CONSTRAINT fk_message_reactions_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS announcements (
                id CHAR(36) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                posted_by_user_id CHAR(36) NOT NULL,
                organization_id CHAR(36) NOT NULL,
                project_id CHAR(36) NULL,
                priority VARCHAR(32) NOT NULL,
                is_published TINYINT(1) NOT NULL DEFAULT 0,
                published_at DATETIME NULL,
                expires_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_announcements_org (organization_id),
                INDEX idx_announcements_project (project_id),
                INDEX idx_announcements_published (is_published),
                INDEX idx_announcements_published_at (published_at),
                CONSTRAINT fk_announcements_user FOREIGN KEY (posted_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_announcements_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                CONSTRAINT fk_announcements_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            ) ENGINE=InnoDB",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS posted_by_user_id CHAR(36) NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS organization_id CHAR(36) NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS project_id CHAR(36) NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 0",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at DATETIME NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL",
            @"ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL",
            @"UPDATE announcements
                SET content = COALESCE(NULLIF(content, ''), body)
                WHERE content IS NULL OR content = ''",
            @"UPDATE announcements
                SET posted_by_user_id = COALESCE(posted_by_user_id, created_by)
                WHERE posted_by_user_id IS NULL",
            @"UPDATE announcements
                SET priority = COALESCE(
                    NULLIF(priority, ''),
                    CASE LOWER(COALESCE(severity, ''))
                        WHEN 'critical' THEN 'Urgent'
                        WHEN 'warning' THEN 'Important'
                        ELSE 'Normal'
                    END)
                WHERE priority IS NULL OR priority = ''",
            @"UPDATE announcements
                SET is_published = 1
                WHERE is_published IS NULL OR is_published = 0",
            @"UPDATE announcements
                SET published_at = COALESCE(published_at, scheduled_for, created_at)
                WHERE published_at IS NULL",
            @"UPDATE announcements
                SET updated_at = COALESCE(updated_at, created_at)
                WHERE updated_at IS NULL",
            @"UPDATE announcements a
                LEFT JOIN app_users u ON u.id = a.posted_by_user_id
                LEFT JOIN projects p ON p.id = a.project_id
                SET a.organization_id = COALESCE(a.organization_id, u.organization_id, p.organization_id)
                WHERE a.organization_id IS NULL",
            @"ALTER TABLE announcements MODIFY COLUMN content TEXT NOT NULL",
            @"ALTER TABLE announcements MODIFY COLUMN priority VARCHAR(32) NOT NULL",
            @"CREATE TABLE IF NOT EXISTS announcement_read_receipts (
                id CHAR(36) PRIMARY KEY,
                announcement_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                read_at DATETIME NOT NULL,
                UNIQUE KEY uq_announcement_receipt (announcement_id, user_id),
                CONSTRAINT fk_announcement_receipts_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
                CONSTRAINT fk_announcement_receipts_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS notifications (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message VARCHAR(500) NOT NULL,
                type VARCHAR(40) NOT NULL,
                reference_id CHAR(36) NULL,
                reference_type VARCHAR(80) NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                INDEX idx_notifications_user (user_id),
                INDEX idx_notifications_read (is_read),
                INDEX idx_notifications_created (created_at),
                CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
                        ) ENGINE=InnoDB",
                        @"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT ''",
                        @"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message VARCHAR(500) NOT NULL DEFAULT ''",
                        @"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id CHAR(36) NULL",
                        @"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(80) NULL",
                        @"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read TINYINT(1) NOT NULL DEFAULT 0",
                        @"ALTER TABLE notifications MODIFY COLUMN type VARCHAR(40) NOT NULL",
                        @"ALTER TABLE notifications MODIFY COLUMN payload JSON NULL",
                        @"UPDATE notifications
                            SET is_read = CASE WHEN read_at IS NULL THEN is_read ELSE 1 END
                            WHERE read_at IS NOT NULL",
                        @"UPDATE notifications
                            SET title = COALESCE(
                                        NULLIF(title, ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.title')), ''),
                                        'Notification'
                                    )
                            WHERE title IS NULL OR title = ''",
                        @"UPDATE notifications
                            SET message = COALESCE(
                                        NULLIF(message, ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.message')), ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.body')), ''),
                                        CONCAT('Notification event: ', type)
                                    )
                            WHERE message IS NULL OR message = ''",
                        @"UPDATE notifications
                            SET reference_type = COALESCE(
                                        NULLIF(reference_type, ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.referenceType')), ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.entityType')), ''),
                                        NULL
                                    )
                            WHERE reference_type IS NULL OR reference_type = ''",
                        @"UPDATE notifications
                            SET reference_id = COALESCE(
                                        reference_id,
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.referenceId')), ''),
                                        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.entityId')), '')
                                    )
                            WHERE reference_id IS NULL"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring collaboration bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task EnsureSecurityTablesAsync(AppDbContext dbContext, ILogger logger)
    {
        var statements = new[]
        {
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_question VARCHAR(255) NULL",
            "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_answer_hash VARCHAR(255) NULL",
            @"CREATE TABLE IF NOT EXISTS security_events (
                id CHAR(36) PRIMARY KEY,
                event_type VARCHAR(64) NOT NULL,
                user_id CHAR(36) NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(512) NULL,
                request_path VARCHAR(255) NOT NULL,
                request_method VARCHAR(16) NOT NULL,
                details TEXT NULL,
                severity VARCHAR(20) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_security_events_user (user_id),
                INDEX idx_security_events_ip (ip_address),
                INDEX idx_security_events_created (created_at),
                INDEX idx_security_events_type (event_type),
                CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS failed_login_attempts (
                id CHAR(36) PRIMARY KEY,
                email VARCHAR(254) NOT NULL,
                ip_address VARCHAR(45) NULL,
                attempted_at DATETIME NOT NULL,
                is_account_lock TINYINT(1) NOT NULL DEFAULT 0,
                lock_expires_at DATETIME NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_failed_login_email (email),
                INDEX idx_failed_login_ip (ip_address),
                INDEX idx_failed_login_attempted (attempted_at)
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS unmask_requests (
                id CHAR(36) PRIMARY KEY,
                requested_by_user_id CHAR(36) NOT NULL,
                target_user_id CHAR(36) NOT NULL,
                field_name VARCHAR(64) NOT NULL,
                verification_token VARCHAR(1024) NOT NULL,
                token_expiry DATETIME NOT NULL,
                is_used TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_unmask_requests_requested_by (requested_by_user_id),
                INDEX idx_unmask_requests_target (target_user_id),
                INDEX idx_unmask_requests_expiry (token_expiry),
                CONSTRAINT fk_unmask_requests_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_unmask_requests_target FOREIGN KEY (target_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS unmask_logs (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NOT NULL,
                target_user_id CHAR(36) NOT NULL,
                field_name VARCHAR(64) NOT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(512) NULL,
                timestamp DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_unmask_logs_user (user_id),
                INDEX idx_unmask_logs_target (target_user_id),
                INDEX idx_unmask_logs_timestamp (timestamp),
                CONSTRAINT fk_unmask_logs_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_unmask_logs_target FOREIGN KEY (target_user_id) REFERENCES app_users(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB",
            @"CREATE TABLE IF NOT EXISTS authentication_logs (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) NULL,
                email VARCHAR(254) NOT NULL,
                event_type VARCHAR(40) NOT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(512) NULL,
                location VARCHAR(128) NULL,
                failure_reason VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_authentication_logs_user (user_id),
                INDEX idx_authentication_logs_ip (ip_address),
                INDEX idx_authentication_logs_created (created_at),
                INDEX idx_authentication_logs_type (event_type),
                CONSTRAINT fk_authentication_logs_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB"
        };

        foreach (var statement in statements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(statement);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Ignoring security bootstrap failure: {Statement}", statement);
            }
        }
    }

    private static async Task SeedSubscriptionsFromOrganizationsAsync(AppDbContext dbContext)
    {
        const string seedSql = @"
            INSERT INTO organization_subscriptions
                (id, organization_id, plan, status, start_date, end_date, billing_cycle, amount, created_at, updated_at)
            SELECT
                UUID(),
                o.id,
                CASE
                    WHEN LOWER(COALESCE(o.plan, '')) = 'enterprise' THEN 'Enterprise'
                    WHEN LOWER(COALESCE(o.plan, '')) IN ('pro', 'professional') THEN 'Professional'
                    ELSE 'Starter'
                END,
                CASE
                    WHEN o.active = 1 THEN 'Active'
                    ELSE 'Cancelled'
                END,
                COALESCE(o.created_at, UTC_TIMESTAMP()),
                DATE_ADD(COALESCE(o.created_at, UTC_TIMESTAMP()), INTERVAL 1 MONTH),
                'Monthly',
                CASE
                    WHEN LOWER(COALESCE(o.plan, '')) = 'enterprise' THEN 4999
                    WHEN LOWER(COALESCE(o.plan, '')) IN ('pro', 'professional') THEN 2499
                    ELSE 999
                END,
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP()
            FROM organizations o
            LEFT JOIN organization_subscriptions s ON s.organization_id = o.id
            WHERE s.id IS NULL;";

        await dbContext.Database.ExecuteSqlRawAsync(seedSql);
    }

    private static async Task EnsureSubscriptionBillingRecordsAsync(AppDbContext dbContext)
    {
        var statements = new[]
        {
            @"UPDATE organization_subscriptions
              SET amount = CASE
                    WHEN LOWER(COALESCE(plan, '')) = 'enterprise' THEN CASE WHEN LOWER(COALESCE(billing_cycle, '')) = 'yearly' THEN 4999 * 12 ELSE 4999 END
                    WHEN LOWER(COALESCE(plan, '')) IN ('professional', 'pro') THEN CASE WHEN LOWER(COALESCE(billing_cycle, '')) = 'yearly' THEN 2499 * 12 ELSE 2499 END
                    ELSE CASE WHEN LOWER(COALESCE(billing_cycle, '')) = 'yearly' THEN 999 * 12 ELSE 999 END
                END
              WHERE amount IS NULL OR amount <= 0",
            @"INSERT INTO payment_transactions
                (id, organization_id, subscription_id, reference_number, amount, method, status, description, billing_period_start, billing_period_end, gateway_message, paid_at, created_at, updated_at)
              SELECT
                UUID(),
                s.organization_id,
                s.id,
                CONCAT('SUP-', DATE_FORMAT(UTC_TIMESTAMP(), '%Y%m%d%H%i%s'), '-', UPPER(SUBSTRING(REPLACE(s.id, '-', ''), 1, 8))),
                s.amount,
                'Manual',
                'Paid',
                CONCAT('Initial ', s.plan, ' subscription payment'),
                s.start_date,
                s.end_date,
                'Backfilled from subscription records',
                COALESCE(s.start_date, s.created_at, UTC_TIMESTAMP()),
                UTC_TIMESTAMP(),
                UTC_TIMESTAMP()
              FROM organization_subscriptions s
              LEFT JOIN payment_transactions p ON p.subscription_id = s.id
              WHERE p.id IS NULL"
        };

        foreach (var statement in statements)
        {
            await dbContext.Database.ExecuteSqlRawAsync(statement);
        }
    }
}
