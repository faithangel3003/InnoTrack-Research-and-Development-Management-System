# 🏗️ InnoTrack SaaS System — Complete Flow & Transaction Guide

**InnoTrack is a Multi-Tenant SaaS Platform for Research & Development Management**

---

## 📊 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│         INNOTRACK SAAS PLATFORM                 │
│         (Single codebase, Multiple tenants)     │
└─────────────────────────────────────────────────┘
          ↓                    ↓                    ↓
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │   TechCorp   │    │   HealthCo   │    │  InnoStartup │
   │ Organization │    │ Organization │    │ Organization │
   │  (Tenant 1)  │    │  (Tenant 2)  │    │  (Tenant 3)  │
   └──────────────┘    └──────────────┘    └──────────────┘
         ↓                    ↓                    ↓
   Users: 15              Users: 22              Users: 8
   Projects: 3            Projects: 5            Projects: 2
   Subscriptions: 1       Subscriptions: 1       Subscriptions: 1
```

**Each organization is completely isolated:**
- Separate data in same DB (OrganizationId foreign key)
- Only users from same org can see each other's data
- Super Admin has visibility across ALL organizations

---

## 🎭 ROLE HIERARCHY & RESPONSIBILITIES

### **1. SUPER ADMIN (System Owner)**
**Manages:** Entire platform
**Access:** All organizations, all data
**Responsibilities:**
- Register/manage company organizations
- Activate/deactivate organizations
- Monitor subscription plans across all companies
- View revenue and payment analytics
- System monitoring and security

### **2. SYSTEM ADMIN / ORGANIZATION ADMIN**
**Manages:** Their single organization
**Access:** All data within their organization only
**Responsibilities:**
- Create/manage users (Project Managers, Team Members)
- Configure organization settings
- Manage team structure
- View organization-specific reports

### **3. PROJECT MANAGER**
**Manages:** Their assigned projects
**Access:** Projects they created, team members in their projects
**Responsibilities:**
- Create and manage R&D projects
- Assign tasks to team members
- Track project progress
- Upload research documents
- Collaborate with team members

### **4. TEAM MEMBER**
**Manages:** Their assigned tasks
**Access:** Tasks assigned to them, shared documents
**Responsibilities:**
- View assigned projects
- Update task status
- Upload research documents to projects
- Collaborate with team members
- Track personal progress

---

## 🔄 COMPLETE USER JOURNEY & TRANSACTIONS

---

## **PHASE 1: COMPANY REGISTRATION (SaaS Signup)**

### **Scenario A: Company Self-Signs Up**

#### Step 1: Company Visits Registration Page

**User (Company Admin) navigates to:** `localhost:5173/signup`

**Frontend shows:**
```
Registration Form:
- Company Name: [____________]
- Email Address: [____________]
- Password: [____________] (min 12 chars)
- Confirm Password: [____________]
- Contact Person: [____________]
- Phone: [____________]
- Industry: [Select dropdown]
- Subscription Plan: [Starter / Professional / Enterprise]
- Terms checkbox: [ ] I agree to terms
```

#### Step 2: Company Submits Registration

**Frontend Validation:**
```javascript
1. Check all required fields filled
2. Email format validation
3. Password policy check:
   - Min 12 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number
4. Passwords match
5. Terms checkbox checked
```

**Frontend Request:**
```
POST /api/auth/register
Body: {
  companyName: "TechCorp",
  email: "admin@techcorp.com",
  password: "SecurePass123!",
  contactPerson: "John Doe",
  phone: "+63-917-123-4567",
  industry: "Technology",
  subscriptionPlan: "Professional"
}
```

#### Step 3: Backend Processing

**AuthController.Register() executes:**

```
1. Validation:
   ├─ Check email not already in system
   ├─ If exists → return 400 "Email already registered"
   └─ If new → continue

2. Create Organization record:
   INSERT INTO Organization (
     Id, Name, IsActive, CreatedAt
   ) VALUES (
     NEWID(), 'TechCorp', true, NOW()
   )
   → Gets: organizationId = "uuid-techcorp-org"

3. Hash password using BCrypt (12 rounds):
   passwordHash = BCrypt.HashPassword(password, 12)
   → Example: "$2b$12$..."

4. Create System Admin User record:
   INSERT INTO User (
     Id, FirstName, LastName, Email, PasswordHash,
     RoleId, OrganizationId, IsActive, CreatedAt
   ) VALUES (
     NEWID(), 'John', 'Doe',
     'admin@techcorp.com',
     passwordHash,
     2, 'uuid-techcorp-org', true, NOW()
   )
   WHERE RoleId = 2 (SystemAdmin role)
   → Gets: userId = "uuid-admin-user-1"

5. Create Subscription record:
   INSERT INTO Subscription (
     Id, CompanyId, Plan, Status,
     StartDate, EndDate, Amount,
     BillingCycle, CreatedAt
   ) VALUES (
     NEWID(), 'uuid-techcorp-org', 'Professional',
     'Active', NOW(), NOW() + 12 months,
     5000.00, 'Monthly', NOW()
   )
   → Gets: subscriptionId = "uuid-sub-techcorp"

6. Log the action:
   INSERT INTO SystemLog (
     UserId, Action, Module, EntityType, EntityId,
     IPAddress, CreatedAt
   ) VALUES (
     NULL, 'RegisterCompany', 'Auth',
     'Organization', 'uuid-techcorp-org',
     '192.168.1.100', NOW()
   )

7. Generate JWT Token:
   token = JWT.Create({
     sub: userId,
     email: "admin@techcorp.com",
     role: "SystemAdmin",
     organizationId: "uuid-techcorp-org",
     exp: NOW() + 24 hours
   })

8. Send response back:
   HTTP 201 Created
   {
     token: "eyJhbGc...",
     user: {
       id: "uuid-admin-user-1",
       firstName: "John",
       lastName: "Doe",
       email: "admin@techcorp.com",
       role: "SystemAdmin",
       organizationId: "uuid-techcorp-org"
     }
   }
```

#### Step 4: Frontend After Success

```javascript
1. Receive 201 response
2. Store token in localStorage["innotrack_token"]
3. Set AuthContext:
   {
     user: { ... },
     token: "eyJhbGc...",
     isAuthenticated: true
   }
4. toast.success("Registration successful! Welcome to InnoTrack")
5. Redirect to /admin/dashboard (System Admin dashboard)
6. Page loads "Welcome, John!" with empty system
```

#### Step 5: Database State After Registration

```sql
-- Organizations table
INSERT INTO Organization VALUES
('uuid-techcorp-org', 'TechCorp', true, '2026-05-04T10:00:00Z', '2026-05-04T10:00:00Z');

-- Users table
INSERT INTO User VALUES
('uuid-admin-user-1', 'John', 'Doe', 'admin@techcorp.com',
 '$2b$12$...hashed_password...', 
 'uuid-systemadmin-role', 'uuid-techcorp-org', true,
 '2026-05-04T10:00:00Z', '2026-05-04T10:00:00Z');

-- Subscriptions table
INSERT INTO Subscription VALUES
('uuid-sub-techcorp', 'uuid-techcorp-org', 'Professional', 'Active',
 '2026-05-04T10:00:00Z', '2027-05-04T10:00:00Z', 5000.00, 'Monthly',
 '2026-05-04T10:00:00Z');

-- SystemLog table (audit)
INSERT INTO SystemLog VALUES
(NEWID(), NULL, 'RegisterCompany', 'Auth', 'Organization',
 'uuid-techcorp-org', NULL, NULL, '192.168.1.100', 
 '2026-05-04T10:00:00Z');
```

---

### **Scenario B: Super Admin Creates Company Account**

**Super Admin navigates to:** `/admin/companies`

**Super Admin clicks:** `[+ Add Company]` button

**Modal opens for creating new company:**
```
Company Name: [____________]
Email: [____________]
Admin Password: [____________]
Contact Person: [____________]
Phone: [____________]
Industry: [Select]
Subscription Plan: [Starter / Professional / Enterprise]
```

**Super Admin fills and submits:**

**Frontend:**
```
POST /api/companies/create
Headers: { Authorization: "Bearer {super-admin-token}" }
Body: {
  companyName: "HealthCo",
  email: "admin@healthco.com",
  password: "HealthAdmin456!",
  contactPerson: "Dr. Maria Santos",
  phone: "+63-917-555-6666",
  industry: "Healthcare",
  subscriptionPlan: "Enterprise"
}
```

**Backend:**
```
CompanyController.CreateCompany() executes:

1. [Authorize(Roles = "SuperAdmin")] ✓ Check passed

2. Validate input
   ├─ Email not in system? ✓
   ├─ Password policy? ✓
   └─ All fields required? ✓

3. Create Organization:
   INSERT INTO Organization (
     Id, Name, IsActive, CreatedAt
   ) VALUES (
     NEWID(), 'HealthCo', true, NOW()
   )
   → organizationId = "uuid-healthco-org"

4. Hash password:
   passwordHash = BCrypt.HashPassword(password, 12)

5. Create System Admin User:
   INSERT INTO User (...)
   VALUES (...SystemAdmin...)
   → userId = "uuid-admin-user-2"

6. Create Subscription:
   INSERT INTO Subscription (...)
   VALUES (...Enterprise, ₱12500...)

7. Log action:
   INSERT INTO SystemLog (
     UserId: "uuid-super-admin",
     Action: "CreateCompany",
     ...
   )

8. Return 201 with company details

9. Super Admin dashboard shows new company
   in Companies table
```

---

## **PHASE 2: SYSTEM ADMIN MANAGES USERS**

**System Admin for TechCorp logs in:**
- Email: admin@techcorp.com
- Password: SecurePass123!
- Redirects to: `/admin/dashboard` (System Admin Dashboard)

**Dashboard shows:**
```
┌─────────────────────────────────────────┐
│ Welcome, John!                          │
│ TechCorp Organization                   │
├─────────────────────────────────────────┤
│ Total Users: 1 (just System Admin)      │
│ Project Managers: 0                     │
│ Team Members: 0                         │
│ Projects: 0                             │
└─────────────────────────────────────────┘

Sidebar Navigation:
[Dashboard]
[User Management]
[Projects]
[Documents]
[Collaboration]
[Reports]
[Settings]
```

---

### **Step 1: System Admin Creates Project Manager**

**System Admin navigates to:** `/admin/users`

**Clicks:** `[+ Create User]` button

**Form appears:**
```
First Name: [____________]
Last Name: [____________]
Email: [____________]
Password: [____________]
Role: [Select: ProjectManager / TeamMember]
Department: [____________] (optional)
```

**Fills form:**
```
First Name: Robert
Last Name: Engineer
Email: robert.engineer@techcorp.com
Password: PM123SecurePass!
Role: ProjectManager
```

**Clicks:** `[Create User]`

**Frontend Validation:**
```
1. All required fields? ✓
2. Email format? ✓
3. Password policy? ✓
4. Role is valid enum? ✓
```

**Frontend Request:**
```
POST /api/users
Headers: { Authorization: "Bearer {admin-token}" }
Body: {
  firstName: "Robert",
  lastName: "Engineer",
  email: "robert.engineer@techcorp.com",
  password: "PM123SecurePass!",
  roleId: 3 // ProjectManager
}
```

**Backend Processing:**

```
UserController.CreateUser() executes:

1. [Authorize(Roles = "SystemAdmin")] ✓

2. Input Validation:
   ├─ Email not in system? ✓
   ├─ Password policy check? ✓
   ├─ Role valid? ✓
   └─ Organization has active subscription? ✓

3. Extract organizationId from JWT claims:
   organizationId = "uuid-techcorp-org"

4. Hash password:
   passwordHash = BCrypt.HashPassword(password, 12)

5. Insert User record:
   INSERT INTO User (
     Id, FirstName, LastName, Email, PasswordHash,
     RoleId, OrganizationId, IsActive, CreatedAt
   ) VALUES (
     NEWID(), 'Robert', 'Engineer',
     'robert.engineer@techcorp.com',
     '$2b$12$...hash...',
     3, 'uuid-techcorp-org', true, NOW()
   )
   → userId = "uuid-pm-robert"

6. Audit log:
   INSERT INTO SystemLog (
     UserId: "uuid-admin-user-1" (System Admin),
     Action: "CreateUser",
     Module: "Users",
     EntityType: "User",
     EntityId: "uuid-pm-robert",
     NewValues: { name, email, role },
     IPAddress: "192.168.1.100",
     CreatedAt: NOW()
   )

7. Return 201 Created
   {
     id: "uuid-pm-robert",
     firstName: "Robert",
     lastName: "Engineer",
     email: "robert.engineer@techcorp.com",
     role: "ProjectManager",
     organizationId: "uuid-techcorp-org"
   }
```

**Frontend After Success:**
```
1. Receive 201 response
2. toast.success("User Robert Engineer created successfully")
3. Close modal
4. Refetch users list
   GET /api/users?page=1&organizationId=uuid-techcorp-org
5. Table updates to show:
   - Robert Engineer | robert.engineer@techcorp.com
   - Role: ProjectManager | Status: Active
```

---

### **Step 2: System Admin Creates Team Members**

**Same process repeats 3 times:**

1. **Create Maria (Team Member)**
   ```
   Email: maria.dev@techcorp.com
   Role: TeamMember
   ```

2. **Create Carlos (Team Member)**
   ```
   Email: carlos.analyst@techcorp.com
   Role: TeamMember
   ```

3. **Create Ana (Team Member)**
   ```
   Email: ana.researcher@techcorp.com
   Role: TeamMember
   ```

**After all users created, system shows:**
```
┌──────────────────────────────────────────┐
│ TechCorp Users                           │
├──────────────────────────────────────────┤
│ John Doe (System Admin)                  │
│ Robert Engineer (Project Manager) [Edit] │
│ Maria Dev (Team Member) [Edit]           │
│ Carlos Analyst (Team Member) [Edit]      │
│ Ana Researcher (Team Member) [Edit]      │
└──────────────────────────────────────────┘

Total: 5 users
- 1 System Admin
- 1 Project Manager
- 3 Team Members
```

---

## **PHASE 3: PROJECT MANAGER MANAGES PROJECTS**

**Robert (Project Manager) receives invite email:**
```
Subject: You've been added to InnoTrack
Body: 
Welcome to TechCorp's Research & Development Platform!
Your account has been created.

Email: robert.engineer@techcorp.com
Password: [Set by System Admin]

Login: http://localhost:5173/login
Dashboard: http://localhost:5173/projects
```

**Robert logs in:**
- Email: robert.engineer@techcorp.com
- Password: PM123SecurePass!
- Redirected to: `/projects` (Project Manager Dashboard)

**Dashboard shows:**
```
┌────────────────────────────────────────┐
│ Welcome, Robert!                       │
│ Projects Dashboard                     │
├────────────────────────────────────────┤
│ Total Projects: 0                      │
│ Active Projects: 0                     │
│ In Progress Tasks: 0                   │
│ Completed This Month: 0%               │
└────────────────────────────────────────┘

Sidebar:
[Dashboard]
[Projects]      ← You are here
[My Tasks]
[Documents]
[Team]
[Reports]
```

---

### **Step 1: Robert Creates First Project**

**Clicks:** `[+ New Project]`

**Form appears:**
```
Project Title: [_____________________________]
Description: [_____________________________
             _____________________________]
Priority: [Low / Medium / High / Critical]
Start Date: [📅 2026-05-05]
End Date: [📅 2026-08-05]
```

**Robert fills:**
```
Title: AI-Powered Drug Discovery Platform
Description: Research and develop ML models
            for accelerating pharmaceutical
            research processes
Priority: High
Start Date: 2026-05-05
End Date: 2026-08-05
```

**Clicks:** `[Create Project]`

**Frontend Validation:**
```
1. Title required? ✓
2. End date > Start date? ✓
3. All fields valid? ✓
```

**Frontend Request:**
```
POST /api/projects
Headers: { Authorization: "Bearer {pm-robert-token}" }
Body: {
  title: "AI-Powered Drug Discovery Platform",
  description: "Research and develop ML models...",
  priority: "High",
  startDate: "2026-05-05",
  endDate: "2026-08-05"
}
```

**Backend Processing:**

```
ProjectController.CreateProject() executes:

1. [Authorize(Roles = "ProjectManager")] ✓

2. Extract from JWT:
   userId = "uuid-pm-robert"
   organizationId = "uuid-techcorp-org"

3. Validate:
   ├─ endDate > startDate? ✓
   └─ Organization has active subscription? ✓

4. Create Project record:
   INSERT INTO Project (
     Id, Title, Description, Status,
     Priority, StartDate, EndDate,
     CreatedByUserId, OrganizationId,
     CreatedAt
   ) VALUES (
     NEWID(), 'AI-Powered Drug Discovery Platform',
     'Research and develop ML models...',
     'Draft', 'High',
     '2026-05-05', '2026-08-05',
     'uuid-pm-robert', 'uuid-techcorp-org',
     NOW()
   )
   → projectId = "uuid-proj-ai-drug"

5. Auto-add creator as project member:
   INSERT INTO ProjectMember (
     ProjectId, UserId, MemberRole, JoinedAt
   ) VALUES (
     'uuid-proj-ai-drug', 'uuid-pm-robert',
     'Lead', NOW()
   )

6. Audit log:
   INSERT INTO SystemLog (
     UserId: 'uuid-pm-robert',
     Action: 'CreateProject',
     Module: 'Projects',
     EntityType: 'Project',
     EntityId: 'uuid-proj-ai-drug',
     NewValues: { title, description, ... }
   )

7. Return 201 Created
```

---

### **Step 2: Robert Adds Team Members to Project**

**Navigates to:** `/projects/{projectId}`

**Project page shows:**
```
┌──────────────────────────────────────────┐
│ AI-Powered Drug Discovery Platform       │
│ High Priority | Draft | 3 months         │
├──────────────────────────────────────────┤
│ [Overview] [Tasks] [Members] [Docs]      │
│                                          │
│ Members: (1)                             │
│ • Robert Engineer (Lead)                 │
│                                          │
│ [+ Add Team Members]                     │
└──────────────────────────────────────────┘
```

**Clicks:** `[+ Add Team Members]`

**Modal appears:**
```
Search team members:
[🔍 Search by name or email...]

Available Members:
□ Maria Dev (maria.dev@techcorp.com)
□ Carlos Analyst (carlos.analyst@techcorp.com)
□ Ana Researcher (ana.researcher@techcorp.com)

Select role for new members:
[Lead / Contributor / Observer]
```

**Robert selects:**
- ☑ Maria Dev (Contributor)
- ☑ Carlos Analyst (Contributor)
- ☑ Ana Researcher (Observer)

**Clicks:** `[Add to Project]`

**Frontend Request:**
```
POST /api/projects/{projectId}/members
Headers: { Authorization: "Bearer {pm-token}" }
Body: {
  members: [
    { userId: "uuid-tm-maria", role: "Contributor" },
    { userId: "uuid-tm-carlos", role: "Contributor" },
    { userId: "uuid-tm-ana", role: "Observer" }
  ]
}
```

**Backend Processing:**

```
ProjectController.AddMembers() executes:

1. [Authorize] + verify user is Lead? ✓

2. For each member in request:

   a) Validate:
      ├─ User exists in same organization? ✓
      ├─ Not already in project? ✓
      └─ Role is valid? ✓

   b) Insert ProjectMember record:
      INSERT INTO ProjectMember (
        Id, ProjectId, UserId, MemberRole, JoinedAt
      ) VALUES (
        NEWID(), 'uuid-proj-ai-drug',
        'uuid-tm-maria', 'Contributor', NOW()
      )

   c) Create notification for member:
      INSERT INTO Notification (
        UserId: 'uuid-tm-maria',
        Title: 'Added to Project',
        Message: 'You were added to "AI-Powered 
                 Drug Discovery Platform"',
        Type: 'ProjectUpdated',
        ReferenceId: 'uuid-proj-ai-drug',
        ReferenceType: 'Project'
      )

3. Audit log each addition

4. Return 200 with updated member list
```

**Frontend After Success:**
```
1. toast.success("3 members added to project")
2. Close modal
3. Member list updates to show all 4 members:
   • Robert Engineer (Lead)
   • Maria Dev (Contributor)
   • Carlos Analyst (Contributor)
   • Ana Researcher (Observer)
```

**Notifications Sent to Members:**
```
Maria, Carlos, Ana each receive in-app notification:
"You were added to AI-Powered Drug Discovery Platform"
Click to navigate to project
```

---

### **Step 3: Robert Activates Project**

**Robert navigates to:** `/projects/{projectId}/edit`

**Form shows:**
```
Status: [Draft ▼]
```

**Robert changes:**
- Status: Draft → Active

**Adds remarks:**
```
"Team assembled, research phase begins.
Moving to active state."
```

**Clicks:** `[Change Status]`

**Frontend Request:**
```
PATCH /api/projects/{projectId}/status
Headers: { Authorization: "Bearer {pm-token}" }
Body: {
  status: "Active",
  remarks: "Team assembled, research phase begins..."
}
```

**Backend Processing:**

```
ProjectController.ChangeStatus() executes:

1. [Authorize] + IsLead? ✓

2. Validate:
   ├─ Project has at least 1 other member?
   │  (Can't activate solo) ✓
   ├─ New status valid? ✓
   └─ Current status allows transition? ✓

3. Update Project:
   UPDATE Project
   SET Status = 'Active',
       UpdatedAt = NOW()
   WHERE Id = 'uuid-proj-ai-drug'

4. Create status history log:
   INSERT INTO ProjectStatusHistory (
     ProjectId, ChangedByUserId,
     OldStatus, NewStatus, ChangedAt, Remarks
   ) VALUES (
     'uuid-proj-ai-drug',
     'uuid-pm-robert',
     'Draft', 'Active',
     NOW(),
     'Team assembled, research phase begins...'
   )

5. Notify all project members:
   For each member in project:
     INSERT INTO Notification (
       UserId: member.UserId,
       Message: 'Project moved to Active'
     )

6. Return 200 OK
```

**Dashboard Now Shows:**
```
Status: [Active Badge - Green]
Members: 4
Progress: 0/0 tasks (0%)
Timeline: May 5 — Aug 5 (Ongoing)
```

---

## **PHASE 4: TEAM MEMBERS MANAGE TASKS**

**Maria (Team Member) logs in:**
- Email: maria.dev@techcorp.com
- Password: [Set by System Admin]
- Dashboard shows: `/my-tasks`

---

### **Step 1: Robert Creates Tasks for Team**

**Robert navigates to:** `/projects/{projectId}`

**Clicks on:** `[Tasks]` tab

**Form to add task:**
```
Title: [____________________________]
Description: [____________________________]
Assign to: [Maria Dev / Carlos / Ana ▼]
Priority: [Low / Medium / High / Critical]
Due Date: [📅 2026-06-15]
```

**Robert creates tasks:**

**Task 1:**
```
Title: Collect pharmaceutical datasets
Assign to: Maria Dev
Priority: High
Due Date: 2026-06-15
```

**Task 2:**
```
Title: Develop data preprocessing pipeline
Assign to: Carlos Analyst
Priority: High
Due Date: 2026-06-30
```

**Task 3:**
```
Title: Document research methodology
Assign to: Ana Researcher
Priority: Medium
Due Date: 2026-07-15
```

**Frontend Request (for Task 1):**
```
POST /api/projects/{projectId}/tasks
Headers: { Authorization: "Bearer {pm-token}" }
Body: {
  title: "Collect pharmaceutical datasets",
  description: "",
  assignedToUserId: "uuid-tm-maria",
  priority: "High",
  dueDate: "2026-06-15"
}
```

**Backend Processing:**

```
TaskController.CreateTask() executes:

1. [Authorize] + IsInProject? ✓

2. Validate:
   ├─ Assignee in same project? ✓
   ├─ Due date within project timeline? ✓
   └─ Title required? ✓

3. Insert Task record:
   INSERT INTO ProjectTask (
     Id, ProjectId, Title, Description,
     AssignedToUserId, AssignedByUserId,
     Status, Priority, DueDate,
     CreatedAt
   ) VALUES (
     NEWID(), 'uuid-proj-ai-drug',
     'Collect pharmaceutical datasets',
     '',
     'uuid-tm-maria',
     'uuid-pm-robert',
     'Todo', 'High',
     '2026-06-15',
     NOW()
   )
   → taskId = "uuid-task-datasets"

4. Create Notification for Maria:
   INSERT INTO Notification (
     UserId: 'uuid-tm-maria',
     Title: 'Task Assigned',
     Message: 'Collect pharmaceutical datasets',
     Type: 'TaskAssigned',
     ReferenceId: 'uuid-task-datasets',
     ReferenceType: 'Task'
   )

5. Audit log

6. Return 201
```

**Real-time Update to Maria:**
```
SignalR Hub sends to Maria:
Event: "TaskAssigned"
Data: {
  taskId: "uuid-task-datasets",
  title: "Collect pharmaceutical datasets",
  priority: "High",
  dueDate: "2026-06-15",
  projectName: "AI-Powered Drug Discovery Platform"
}

Maria's notification bell gets badge count +1
Toast appears: "New task assigned to you"
```

---

### **Step 2: Maria Updates Task Status**

**Maria navigates to:** `/my-tasks`

**Dashboard shows:**
```
┌────────────────────────────────────────┐
│ My Tasks (3 total)                     │
├────────────────────────────────────────┤
│                                        │
│ [Todo (1)]  [In Progress (0)]          │
│                                        │
│ Todo:                                  │
│ ☐ Collect pharmaceutical datasets      │
│   Project: AI-Powered...               │
│   Priority: High | Due: Jun 15         │
│   [⋯ Update Status]                    │
└────────────────────────────────────────┘
```

**Maria clicks task status dropdown:**
```
Current: [Todo ▼]
Options:
- In Progress
- Under Review
- Done
- Blocked
```

**Changes to:** `In Progress`

**Frontend Request:**
```
PATCH /api/tasks/{taskId}/status
Headers: { Authorization: "Bearer {maria-token}" }
Body: {
  status: "InProgress"
}
```

**Backend Processing:**

```
TaskController.UpdateStatus() executes:

1. [Authorize] + IsAssigned or IsLead? ✓

2. Validate status transition ✓

3. Update Task:
   UPDATE ProjectTask
   SET Status = 'InProgress',
       UpdatedAt = NOW()
   WHERE Id = 'uuid-task-datasets'

4. Notify Project Lead (Robert):
   INSERT INTO Notification (
     UserId: 'uuid-pm-robert',
     Message: 'Maria moved "Collect datasets"
              to In Progress'
   )

5. Return 200
```

**Frontend Optimistic Update:**
```
1. Immediately change task card:
   Status: [In Progress Badge - Blue]
2. Receive 200 → toast.success
3. Task moves to "In Progress" column
   in kanban board
```

**Robert (Lead) sees in real-time:**
```
Notification: "Maria moved task to In Progress"
Task board updates automatically via SignalR
Progress calculation updates: 1/3 tasks started
```

---

### **Step 3: Team Members Upload Documents**

**Maria navigates to:** `/documents`

**Page shows:**
```
┌────────────────────────────────────────┐
│ Research Documents                     │
│ [Upload Document]                      │
├────────────────────────────────────────┤
│ Filter by Project: [AI-Powered ▼]      │
│ Filter by Type: [All ▼]                │
│                                        │
│ No documents yet                       │
└────────────────────────────────────────┘
```

**Maria clicks:** `[Upload Document]`

**Form appears:**
```
Title: [____________________________]
Description: [____________________________]
Project: [AI-Powered Drug Discovery ▼]
Category: [Research Data / Code / Reports ▼]
Tags: [______________] [______________]
File: [Choose file or drag & drop]
```

**Maria uploads:**
```
Title: Pharmaceutical Dataset v1.0
Description: Consolidated dataset from 500+ drugs
Project: AI-Powered Drug Discovery
Category: Research Data
Tags: datasets, pharmaceutical, ml
File: pharma-data-v1.csv (45 MB)
```

**Frontend Validation:**
```
1. File size: 45 MB < 50 MB limit ✓
2. File type: .csv is allowed ✓
3. All metadata filled ✓
```

**Frontend Upload:**
```
File upload starts with progress bar:
0% ━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%

POST /api/documents/upload (multipart/form-data)
Headers: { Authorization: "Bearer {maria-token}" }
Body:
- title: "Pharmaceutical Dataset v1.0"
- description: "Consolidated dataset..."
- projectId: "uuid-proj-ai-drug"
- categoryId: "uuid-cat-research"
- tags: ["datasets", "pharmaceutical", "ml"]
- file: [binary data of pharma-data-v1.csv]
```

**Backend Processing:**

```
DocumentController.Upload() executes:

1. [Authorize] + InProject? ✓

2. Validation:
   ├─ File size ≤ 50 MB? ✓
   ├─ File type allowed?
   │  (.pdf, .docx, .xlsx, .csv, .txt,
   │   .png, .jpg, .zip) ✓
   ├─ MIME type matches extension? ✓
   │  (Prevent: .pdf file with .exe content)
   └─ Title, project required? ✓

3. Generate secure filename:
   secureFileName = Guid.NewGuid() + ".csv"
   → "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6.csv"

4. Save file to disk:
   filePath = "/wwwroot/uploads/{orgId}/{projectId}/"
            + secureFileName
   → "/wwwroot/uploads/uuid-techcorp-org/
      uuid-proj-ai-drug/a1b2c3d4-e5f6...csv"

   File.WriteAllBytes(filePath, fileContent)

5. Create Document record:
   INSERT INTO Document (
     Id, Title, Description, FileName,
     OriginalFileName, FilePath, FileSize,
     FileType, FileExtension,
     ProjectId, CategoryId, UploadedByUserId,
     OrganizationId, Version,
     CreatedAt
   ) VALUES (
     NEWID(),
     'Pharmaceutical Dataset v1.0',
     'Consolidated dataset...',
     'a1b2c3d4-e5f6...csv',
     'pharma-data-v1.csv',
     '/uploads/uuid-techcorp-org/uuid-proj-ai-drug/a1b2c3d4...',
     47185920, // 45 MB in bytes
     'text/csv',
     '.csv',
     'uuid-proj-ai-drug',
     'uuid-cat-research',
     'uuid-tm-maria',
     'uuid-techcorp-org',
     1,
     NOW()
   )
   → documentId = "uuid-doc-pharma"

6. Assign tags:
   For each tag in request:
     INSERT INTO DocumentTagMap (
       DocumentId: 'uuid-doc-pharma',
       TagId: tag.Id
     )

7. Create access log:
   INSERT INTO DocumentAccessLog (
     DocumentId: 'uuid-doc-pharma',
     UserId: 'uuid-tm-maria',
     Action: 'Uploaded',
     AccessedAt: NOW(),
     IPAddress: "192.168.1.100"
   )

8. Notify project members:
   For each member in project:
     INSERT INTO Notification (
       UserId: member.UserId,
       Title: 'Document Uploaded',
       Message: 'Maria uploaded "Pharmaceutical Dataset v1.0"'
     )

9. Return 201
```

**Frontend After Success:**
```
1. File upload completes
2. toast.success("Document uploaded successfully")
3. Close upload modal
4. Document appears in list:
   📄 Pharmaceutical Dataset v1.0
   by Maria Dev | 45 MB | text/csv
   Uploaded: May 4, 2026 | #datasets #pharmaceutical #ml
```

**All Team Members See:**
```
Notification: "Maria uploaded document to project"
Documents tab updates with new file
Click to download or view
```

---

## **PHASE 5: COLLABORATION IN REAL-TIME**

### **Robert Sends Message to Team**

**Robert opens:** `/projects/{projectId}/collaboration`

**Sees chat channel for project:**
```
┌────────────────────────────────────────┐
│ Project Channel: AI-Powered Drug...    │
│ 4 members online                       │
├────────────────────────────────────────┤
│                                        │
│ [Chat history...]                      │
│                                        │
│ [Type message...]  [📎] [😊] [Send]   │
└────────────────────────────────────────┘
```

**Robert types and sends:**
```
"Great progress team! I see Maria's dataset is
ready. Let's start with data exploration by
Friday. Questions?"
```

**Frontend via SignalR:**
```
HubConnection to CollaborationHub sends:
sendMessage({
  channelId: "uuid-proj-ai-drug-channel",
  content: "Great progress team! ...",
  parentMessageId: null
})
```

**Backend SignalR Hub:**
```
CollaborationHub.SendMessage() executes:

1. Validate JWT from connection ✓
2. Save message to DB:
   INSERT INTO Message (
     Id, ChannelId, SenderId, Content,
     Type, CreatedAt
   ) VALUES (
     NEWID(),
     'uuid-proj-ai-drug-channel',
     'uuid-pm-robert',
     'Great progress team! ...',
     'Text',
     NOW()
   )

3. Broadcast to all channel members:
   For each member with active connection:
     hubContext.Clients
       .Group(channelId)
       .SendAsync("ReceiveMessage", {
         id: "uuid-msg-123",
         senderName: "Robert Engineer",
         content: "Great progress team! ...",
         timestamp: NOW(),
         isOwn: false/true
       })
```

**All Members See in Real-time:**
```
Chat updates instantly:

Robert Engineer [10:45 AM]
Great progress team! I see Maria's dataset is
ready. Let's start with data exploration by
Friday. Questions?

[React, Reply, Pin buttons on hover]
```

---

## **PHASE 6: ANALYTICS & REPORTING**

### **Super Admin Views Revenue Dashboard**

**Super Admin navigates to:** `/admin/dashboard`

**Dashboard displays:**
```
┌────────────────────────────────────────┐
│ INNOTRACK SAAS PLATFORM OVERVIEW       │
├────────────────────────────────────────┤
│                                        │
│ Total Companies: 18                    │
│ Active Subscriptions: 17               │
│ Total Users: 87                        │
│ Total Revenue: ₱125,000                │
│                                        │
├────────────────────────────────────────┤
│ Revenue Trend (Last 6 months)          │
│        ╱─────────                      │
│      ╱                                 │
│    ╱                                   │
│                                        │
│ Subscription Distribution:              │
│ ● Starter (8)   40%                    │
│ ● Professional (4) 20%                 │
│ ● Enterprise (5) 25%                   │
│                                        │
│ Recent Companies:                      │
│ • TechCorp (Professional)              │
│ • HealthCo (Enterprise)                │
│ • InnoStartup (Starter)                │
│                                        │
│ Recent Payments:                       │
│ • TechCorp: ₱5,000 (Paid)              │
│ • HealthCo: ₱12,500 (Paid)             │
│ • StartupXYZ: ₱1,500 (Pending)         │
└────────────────────────────────────────┘
```

**System Admin for TechCorp views:** `/admin/reports`

**Generates project report:**
```
Report Type: Project Performance
Date Range: May 1 - May 4, 2026
Format: PDF

[Download Report ↓]
```

**Backend generates PDF:**
```
ReportService.GenerateProjectReport() executes:

1. Query project data:
   SELECT * FROM Project
   WHERE OrganizationId = 'uuid-techcorp-org'
   AND CreatedAt BETWEEN @startDate AND @endDate

2. Aggregate metrics:
   - Total projects: 1
   - Active projects: 1
   - Completed: 0
   - Tasks created: 3
   - Tasks completed: 0
   - Team members: 4
   - Documents uploaded: 1

3. Generate PDF using QuestPDF:
   - Cover page with org name
   - Executive summary table
   - Project details section
   - Charts and graphs
   - Audit trail

4. Save PDF:
   pdfPath = "/wwwroot/exports/
             uuid-techcorp-org/
             report-project-2026-05-04.pdf"

5. Create ReportSnapshot record:
   INSERT INTO ReportSnapshot (...)
   VALUES (...)

6. Return byte[] (Blob) to client
```

---

## **PHASE 7: MULTI-TENANT DATA ISOLATION**

### **How Data Stays Separate**

**Every query includes organization filter:**

```csharp
// When Maria (from TechCorp) logs in:
var userRole = "TeamMember";
var organizationId = "uuid-techcorp-org"; // From JWT

// Fetch her tasks:
var tasks = dbContext.ProjectTasks
  .Include(t => t.Project)
  .Where(t => t.AssignedToUserId == mariasUserId)
  .Where(t => t.Project.OrganizationId == organizationId)
  // ↑ This filters to only TechCorp's tasks
  .ToList();

// Maria can NEVER see HealthCo's tasks:
// Even if she tried to guess task ID from HealthCo,
// the organizationId filter prevents access
```

### **Data Isolation Levels**

```
Level 1: Database Row-level
├─ Every table has OrganizationId
├─ All queries filter by org
└─ Prevents SQL access to other org data

Level 2: API Authorization
├─ JWT contains organizationId
├─ API validates org matches resource
├─ User can't access resources from other org

Level 3: UI/Frontend
├─ Only shows org's data
├─ Sidebar navigates within org
└─ Links can't escape org boundary
```

---

## **PHASE 8: AUDIT & COMPLIANCE**

### **Audit Log Example: Complete Lifecycle**

**User:** John Doe (System Admin, TechCorp)

**All actions logged to SystemLog table:**

```sql
-- Created Robert (PM)
INSERT INTO SystemLog VALUES
(NEWID(), 'uuid-admin-john', 'CreateUser', 'Users',
 'User', 'uuid-pm-robert',
 NULL,
 '{"firstName":"Robert","lastName":"Engineer",...}',
 '192.168.1.100', NOW());

-- Robert created project
INSERT INTO SystemLog VALUES
(NEWID(), 'uuid-pm-robert', 'CreateProject', 'Projects',
 'Project', 'uuid-proj-ai-drug',
 NULL,
 '{"title":"AI-Powered...","status":"Draft",...}',
 '192.168.1.101', NOW());

-- Robert added team members
INSERT INTO SystemLog VALUES
(NEWID(), 'uuid-pm-robert', 'AddMembers', 'Projects',
 'ProjectMember', 'uuid-proj-ai-drug',
 NULL,
 '{"members":[{"id":"uuid-tm-maria",...}]}',
 '192.168.1.101', NOW());

-- Maria uploaded document
INSERT INTO SystemLog VALUES
(NEWID(), 'uuid-tm-maria', 'UploadDocument',
 'Documents', 'Document', 'uuid-doc-pharma',
 NULL,
 '{"title":"Pharmaceutical Dataset...",...}',
 '192.168.1.102', NOW());
```

**Super Admin can query:**
```sql
SELECT *
FROM SystemLog
WHERE CreatedAt BETWEEN @startDate AND @endDate
ORDER BY CreatedAt DESC;

Results show every action by every user
across all organizations with timestamps
and who did what when
```

---

## **SUMMARY: COMPLETE TRANSACTION FLOW**

```
┌─────────────────────────────────────────────────────┐
│ USER LIFECYCLE IN INNOTRACK SAAS SYSTEM             │
└─────────────────────────────────────────────────────┘

[New Company Registers]
         ↓
[Super Admin Approval/Creation]
         ↓
[Organization Record Created]
[System Admin User Created]
[Subscription Assigned]
         ↓
[System Admin Logs In]
         ↓
[Creates Project Manager + Team Members]
         ↓
[PM Logs In]
         ↓
[PM Creates Project]
[PM Adds Team Members to Project]
[PM Creates Tasks]
[PM Uploads Documents]
[PM Manages Project Status]
         ↓
[Team Members Log In]
         ↓
[View Assigned Tasks]
[Update Task Status]
[Upload Research Documents]
[Collaborate in Real-time Chat]
         ↓
[Analytics Generated]
[Reports Downloaded]
         ↓
[Super Admin Views Revenue Across All Orgs]
```

---

## **KEY MULTI-TENANT FEATURES**

| Feature | Implementation |
|---------|-----------------|
| **Data Isolation** | OrganizationId in every table, all queries filtered |
| **Auth** | JWT contains organizationId, verified on every request |
| **Billing** | Subscription per organization, tracked globally |
| **Users** | Each org has own users, can't see other org's users |
| **Projects** | Each org's projects isolated, not cross-visible |
| **Analytics** | SuperAdmin sees all orgs, Admins see own org only |
| **Notifications** | Sent only to users in same org |
| **Files** | Stored in /uploads/{orgId}/{projectId}/ folder |
| **Audit Logs** | All actions logged by org + user + timestamp |

---

## **SECURITY CONSIDERATIONS FOR SAAS**

```
1. JWT Token contains organizationId
   ✓ Prevents token use across orgs

2. Every API endpoint checks [Authorize]
   ✓ No public routes to org data

3. Database queries always filter by org
   ✓ Even if endpoint bypassed, DB enforces isolation

4. Files stored by org ID in path
   ✓ File access URLs include org verification

5. Rate limiting per organization
   ✓ One org's heavy usage doesn't affect others

6. Subscription validation
   ✓ User's org must have active subscription
   ✓ Features gated by subscription plan
```

---

## **EXAMPLE: FULL TRANSACTION WITH TENANT ISOLATION**

**Scenario:** Maria (TechCorp Team Member) tries to access HealthCo's document

**Step 1: Maria navigates to:**
```
GET /api/documents/uuid-doc-healthco-secret
Headers: { Authorization: "Bearer {maria-token}" }
```

**Token contains:**
```javascript
{
  organizationId: "uuid-techcorp-org",
  userId: "uuid-tm-maria",
  role: "TeamMember"
}
```

**Backend Check:**
```csharp
DocumentController.GetById(documentId)
{
  var document = dbContext.Documents
    .FirstOrDefault(d => d.Id == documentId);

  // Check 1: Document exists?
  if (document == null)
    return 404 NotFound;

  // Check 2: Organization matches?
  var userOrgId = claims.FindFirst("organizationId").Value;
  if (document.OrganizationId != userOrgId)
    return 403 Forbidden; // ← BLOCKED HERE

  // Would never reach this:
  return 200 Ok(document);
}
```

**Result:** Maria gets 403 Forbidden
```
Response: {
  error: "Access Denied",
  message: "You don't have permission to access this resource"
}
```

**Security Event Logged:**
```sql
INSERT INTO SecurityLog (
  EventType: 'UnauthorizedAccess',
  UserId: 'uuid-tm-maria',
  IPAddress: '192.168.1.102',
  RequestPath: '/api/documents/uuid-doc-healthco-secret',
  Severity: 'Medium',
  CreatedAt: NOW()
)
```

---

**That's the complete flow of your InnoTrack SaaS system!**

Every transaction is secure, isolated by tenant, logged, and follows multi-tenant best practices.
