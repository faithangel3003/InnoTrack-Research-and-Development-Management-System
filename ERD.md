# InnoTrack ERD (Service-Aligned v1)

This ERD is designed from your requested services and use cases, with multi-tenant organizations, role-based access, module activation, project lifecycle, collaboration, documentation, analytics, and auditability.

## Core Services Covered

1. Project Tracking and Monitoring Services
2. Product Development Lifecycle Management Services
3. Research Documentation and File Management Services
4. Collaboration and Communication Services
5. Innovation Analytics and Reporting Services

## Mermaid ERD

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ PROFILES : has
    ORGANIZATIONS ||--o{ USER_ROLES : governs
    ORGANIZATIONS ||--o{ ORG_MODULE_SETTINGS : configures
    ORGANIZATIONS ||--o{ PROJECTS : owns
    ORGANIZATIONS ||--o{ REPORTS : generates

    SYSTEM_MODULES ||--o{ ORG_MODULE_SETTINGS : toggled_for

    PROFILES ||--o{ USER_ROLES : assigned
    PROFILES ||--o{ PROJECT_MEMBERS : joins
    PROFILES ||--o{ PROJECTS : creates
    PROFILES ||--o{ TASKS : assigned_to
    PROFILES ||--o{ TASK_COMMENTS : writes
    PROFILES ||--o{ DOCUMENTS : uploads
    PROFILES ||--o{ MESSAGES : sends
    PROFILES ||--o{ ACTIVITY_LOGS : performs

    PROJECTS ||--o{ PROJECT_MEMBERS : includes
    PROJECTS ||--o{ TASKS : contains
    PROJECTS ||--o{ DOCUMENTS : stores
    PROJECTS ||--o{ LIFECYCLE_STAGE_HISTORY : progresses
    PROJECTS ||--o{ MESSAGES : discusses
    PROJECTS ||--o{ ANALYTICS_SNAPSHOTS : summarizes

    TASKS ||--o{ TASK_COMMENTS : discussed_in

    ORGANIZATIONS {
      uuid id PK
      string name
      string plan
      boolean active
      timestamp created_at
      timestamp updated_at
    }

    PROFILES {
      uuid id PK "auth.users.id"
      uuid organization_id FK
      string full_name
      string avatar_url
      timestamp created_at
      timestamp updated_at
    }

    USER_ROLES {
      uuid id PK
      uuid user_id FK
      uuid organization_id FK
      enum role "super_admin|system_admin|project_manager|team_member"
      timestamp created_at
    }

    SYSTEM_MODULES {
      uuid id PK
      string code "tracking,lifecycle,docs,collab,analytics"
      string name
      text description
      boolean default_enabled
    }

    ORG_MODULE_SETTINGS {
      uuid id PK
      uuid organization_id FK
      uuid module_id FK
      boolean enabled
      uuid updated_by FK
      timestamp updated_at
    }

    PROJECTS {
      uuid id PK
      uuid organization_id FK
      string name
      text description
      text objective
      enum status
      enum priority
      enum lifecycle_stage
      date start_date
      date end_date
      uuid created_by FK
      timestamp created_at
      timestamp updated_at
    }

    PROJECT_MEMBERS {
      uuid id PK
      uuid project_id FK
      uuid user_id FK
      string role_in_project
      timestamp joined_at
    }

    TASKS {
      uuid id PK
      uuid project_id FK
      string title
      text description
      uuid assignee_id FK
      enum status
      enum priority
      date due_date
      uuid parent_task_id FK
      uuid created_by FK
      timestamp created_at
      timestamp updated_at
    }

    TASK_COMMENTS {
      uuid id PK
      uuid task_id FK
      uuid user_id FK
      text body
      timestamp created_at
      timestamp updated_at
    }

    DOCUMENTS {
      uuid id PK
      uuid project_id FK
      string name
      text description
      string storage_path
      string mime_type
      int size
      int version
      uuid uploaded_by FK
      string_array tags
      timestamp created_at
      timestamp updated_at
    }

    LIFECYCLE_STAGE_HISTORY {
      uuid id PK
      uuid project_id FK
      enum stage
      timestamp entered_at
      uuid approved_by FK
      jsonb deliverables
      timestamp approved_at
    }

    MESSAGES {
      uuid id PK
      uuid organization_id FK
      uuid project_id FK
      uuid sender_id FK
      text body
      string channel_type "project|org|task"
      timestamp created_at
    }

    ANALYTICS_SNAPSHOTS {
      uuid id PK
      uuid project_id FK
      date snapshot_date
      numeric completion_rate
      int overdue_tasks
      int document_count
      numeric lifecycle_velocity
      timestamp created_at
    }

    REPORTS {
      uuid id PK
      uuid organization_id FK
      uuid generated_by FK
      string report_type "portfolio|project|innovation"
      jsonb payload
      timestamp generated_at
    }

    ACTIVITY_LOGS {
      uuid id PK
      uuid user_id FK
      uuid organization_id FK
      string action
      string entity_type
      uuid entity_id
      jsonb metadata
      inet ip_address
      timestamp created_at
    }
```

## Why These Additional Tables

1. `SYSTEM_MODULES` + `ORG_MODULE_SETTINGS`
   - Needed for Super Administrator capability to activate/deactivate modules per organization.
2. `MESSAGES`
   - Supports Collaboration and Communication beyond task comments.
3. `ANALYTICS_SNAPSHOTS` + `REPORTS`
   - Supports Innovation Analytics and Reporting as first-class data, not derived-only.
4. `ACTIVITY_LOGS` with `organization_id`
   - Improves audit log filtering for both Super Admin and System Admin usage.

## Role-to-Data Responsibility Mapping

1. Super Administrator
   - `organizations`, `system_modules`, `org_module_settings`, `activity_logs` (global oversight)
2. System Administrator (Org Manager)
   - `profiles`, `user_roles`, `org_module_settings`, `activity_logs` (org scope)
3. Project Manager
   - `projects`, `project_members`, `tasks`, `lifecycle_stage_history`, `reports`
4. Team Member
   - `tasks` (assigned updates), `documents` (uploads), `task_comments`, `messages`

## Notes for Current SQL Alignment

Your existing schema already has most core entities. To fully align with this ERD, add these tables in the next migration:

1. `system_modules`
2. `org_module_settings`
3. `messages`
4. `analytics_snapshots`
5. `reports`

Also consider adding `organization_id` to `activity_logs` if you want faster organization-level audit queries.
