export type Role = 'super_admin' | 'system_admin' | 'project_manager' | 'team_member'

export type HealthStatus = 'ok' | 'warning' | 'critical'

export interface MetricCard {
  title: string
  value: string
  delta?: string
  subtitle?: string
}

export interface OrganizationRow {
  id: string
  name: string
  owner: string
  memberCount: number
  projectCount: number
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: string
  status: 'active' | 'suspended'
}

export interface UserRow {
  id: string
  avatarUrl?: string
  name: string
  email: string
  organization: string
  roles: Role[]
  lastLogin: string
  status: 'active' | 'inactive'
}

export interface ProjectRow {
  id: string
  name: string
  orgName: string
  lifecycleStage: 'Ideation' | 'Research' | 'Development' | 'Testing' | 'Launch'
  leadResearcher: string
  lastActivity: string
  tasksCount: number
  documentsCount: number
}

export interface AuditLogRow {
  id: string
  created_at: string
  actor_name: string
  actor_org: string
  action: string
  entity_type: string
  ip_address: string
  severity: 'info' | 'warning' | 'critical'
}

export interface AnnouncementRow {
  id: string
  title: string
  severity: 'info' | 'warning' | 'critical'
  target_type: 'all' | 'role' | 'org'
  sent_at: string
  read_rate: number
}
