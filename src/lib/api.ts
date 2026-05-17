import { supabase } from './supabase'
import type {
  AnnouncementRow,
  AuditLogRow,
  MetricCard,
  OrganizationRow,
  ProjectRow,
  Role,
  UserRow,
} from './types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
const AUTH_STORAGE_KEY = 'innotrack_auth_session'

export interface AuthSession {
  userId: string
  email: string
  name: string
  organizationId: string | null
  roles: string[]
}

type SupabaseOrganizationRelation = {
  name?: string | null
}

type SupabaseProjectRecord = {
  id: string
  name: string
  lifecycle_stage?: string | null
  updated_at?: string | null
  organizations?: SupabaseOrganizationRelation | SupabaseOrganizationRelation[] | null
}

type SupabaseAuditLogRecord = {
  id: string
  created_at?: string | null
  action: string
  entity_type?: string | null
  ip_address?: string | null
  severity?: AuditLogRow['severity'] | null
}

type SupabaseAnnouncementRecord = {
  id: string
  title: string
  severity?: AnnouncementRow['severity'] | null
  target_type?: AnnouncementRow['target_type'] | null
  created_at?: string | null
}

function resolveOrganizationName(organizations?: SupabaseOrganizationRelation | SupabaseOrganizationRelation[] | null) {
  if (Array.isArray(organizations)) {
    return organizations[0]?.name ?? 'Unknown org'
  }

  return organizations?.name ?? 'Unknown org'
}

function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function getAuthSession() {
  return readAuthSession()
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function writeAuthSession(session: AuthSession) {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function getActorUserId() {
  return readAuthSession()?.userId || ''
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('API base URL is not configured')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getActorUserId() ? { 'x-user-id': getActorUserId() } : {}),
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function extractApiErrorMessage(response: Response, fallback: string) {
  const raw = await response.text()
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string }
    return parsed.message || fallback
  } catch {
    return raw || fallback
  }
}

export async function loginWithCredentials(input: { email: string; password: string; captchaToken: string; captchaChallengeId?: string }): Promise<AuthSession> {
  if (!apiBaseUrl) {
    throw new Error('Login API is not configured')
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getActorUserId() ? { 'x-user-id': getActorUserId() } : {}),
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await extractApiErrorMessage(response, `Login failed: ${response.status}`))
  }

  const data = await response.json() as {
    user: {
      id: string
      email: string
      name: string
      organizationId: string | null
      roles: string[]
    }
  }

  const session: AuthSession = {
    userId: data.user.id,
    email: data.user.email,
    name: data.user.name,
    organizationId: data.user.organizationId,
    roles: data.user.roles,
  }

  writeAuthSession(session)
  return session
}

const mockOrgs: OrganizationRow[] = [
  {
    id: 'org-1',
    name: 'Nova Labs',
    owner: 'Sophia Reyes',
    memberCount: 44,
    projectCount: 12,
    plan: 'enterprise',
    createdAt: '2025-08-11',
    status: 'active',
  },
  {
    id: 'org-2',
    name: 'BlueHelix Research',
    owner: 'Daniel Cruz',
    memberCount: 21,
    projectCount: 7,
    plan: 'pro',
    createdAt: '2025-12-02',
    status: 'active',
  },
  {
    id: 'org-3',
    name: 'Aether Dynamics',
    owner: 'Mara Lim',
    memberCount: 9,
    projectCount: 2,
    plan: 'free',
    createdAt: '2026-01-17',
    status: 'suspended',
  },
]

const mockUsers: UserRow[] = [
  {
    id: 'u-1',
    name: 'Faith Angel',
    email: 'faith@innotrack.app',
    organization: 'InnoTrack Platform',
    roles: ['super_admin'],
    lastLogin: '2026-04-20 09:03',
    status: 'active',
  },
  {
    id: 'u-2',
    name: 'Sophia Reyes',
    email: 'sophia@novalabs.com',
    organization: 'Nova Labs',
    roles: ['system_admin', 'project_manager'],
    lastLogin: '2026-04-20 08:51',
    status: 'active',
  },
  {
    id: 'u-3',
    name: 'Ian Velasco',
    email: 'ian@bluehelix.io',
    organization: 'BlueHelix Research',
    roles: ['team_member'],
    lastLogin: '2026-04-19 17:11',
    status: 'active',
  },
]

const mockProjects: ProjectRow[] = [
  {
    id: 'p-1',
    name: 'Smart Polymer Sensor',
    orgName: 'Nova Labs',
    lifecycleStage: 'Testing',
    leadResearcher: 'Sophia Reyes',
    lastActivity: '2026-04-20 08:59',
    tasksCount: 24,
    documentsCount: 31,
  },
  {
    id: 'p-2',
    name: 'Biofuel Catalyst X',
    orgName: 'BlueHelix Research',
    lifecycleStage: 'Research',
    leadResearcher: 'Daniel Cruz',
    lastActivity: '2026-04-20 07:44',
    tasksCount: 18,
    documentsCount: 15,
  },
]

const mockAuditLogs: AuditLogRow[] = [
  {
    id: 'l-1',
    created_at: '2026-04-20 09:02',
    actor_name: 'Faith Angel',
    actor_org: 'InnoTrack Platform',
    action: 'organization.created',
    entity_type: 'organization',
    ip_address: '103.20.91.8',
    severity: 'critical',
  },
  {
    id: 'l-2',
    created_at: '2026-04-20 08:41',
    actor_name: 'Sophia Reyes',
    actor_org: 'Nova Labs',
    action: 'user.role.escalated',
    entity_type: 'user_role',
    ip_address: '103.20.91.45',
    severity: 'warning',
  },
]

const mockAnnouncements: AnnouncementRow[] = [
  {
    id: 'a-1',
    title: 'Scheduled maintenance on April 24',
    severity: 'warning',
    target_type: 'all',
    sent_at: '2026-04-18 10:30',
    read_rate: 78,
  },
]

export async function checkSuperAdminRole(): Promise<boolean> {
  if (apiBaseUrl) {
    try {
      const userId = getActorUserId()
      if (!userId) return false
      const data = await apiRequest<{ isSuperAdmin: boolean }>(
        `/api/auth/is-super-admin?userId=${encodeURIComponent(userId)}`,
      )
      return Boolean(data.isSuperAdmin)
    } catch {
      return false
    }
  }

  if (!supabase) return true

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return false

  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .limit(1)

  if (error) return false
  return Boolean(data && data.length > 0)
}

export async function getOverviewMetrics(): Promise<MetricCard[]> {
  if (apiBaseUrl) {
    return apiRequest<MetricCard[]>('/api/overview/metrics')
  }

  await delay(250)
  return [
    { title: 'Total Organizations', value: '128', delta: '+9.3%', subtitle: 'month over month' },
    { title: 'Total Active Users', value: '4,812', delta: '+4.1%', subtitle: '391 online now' },
    { title: 'Active Projects', value: '932', delta: '+6.8%', subtitle: 'Testing: 209, Launch: 88' },
    { title: 'System Uptime', value: '99.97%', subtitle: 'Storage used: 12.8 TB' },
  ]
}

export async function getOrganizations(): Promise<OrganizationRow[]> {
  if (apiBaseUrl) {
    try {
      return await apiRequest<OrganizationRow[]>('/api/organizations')
    } catch {
      return mockOrgs
    }
  }

  await delay(250)
  if (!supabase) return mockOrgs

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, plan, active, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) return mockOrgs

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    owner: 'N/A',
    memberCount: 0,
    projectCount: 0,
    plan: (row.plan || 'free') as OrganizationRow['plan'],
    createdAt: row.created_at?.slice(0, 10) || '',
    status: row.active ? 'active' : 'suspended',
  }))
}

export async function getUsers(): Promise<UserRow[]> {
  if (apiBaseUrl) {
    try {
      return await apiRequest<UserRow[]>('/api/users')
    } catch {
      return mockUsers
    }
  }

  await delay(250)
  return mockUsers
}

export async function getProjects(): Promise<ProjectRow[]> {
  if (apiBaseUrl) {
    try {
      return await apiRequest<ProjectRow[]>('/api/projects')
    } catch {
      return mockProjects
    }
  }

  await delay(250)
  if (!supabase) return mockProjects

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, lifecycle_stage, updated_at, organizations(name)')
    .order('updated_at', { ascending: false })

  if (error || !data) return mockProjects

  return (data as SupabaseProjectRecord[]).map((row) => ({
    id: row.id,
    name: row.name,
    orgName: resolveOrganizationName(row.organizations),
    lifecycleStage: (row.lifecycle_stage ?? 'Ideation') as ProjectRow['lifecycleStage'],
    leadResearcher: 'N/A',
    lastActivity: row.updated_at?.replace('T', ' ').slice(0, 16) ?? '-',
    tasksCount: 0,
    documentsCount: 0,
  }))
}

export async function getAuditLogs(): Promise<AuditLogRow[]> {
  if (apiBaseUrl) {
    try {
      return await apiRequest<AuditLogRow[]>('/api/audit-logs')
    } catch {
      return mockAuditLogs
    }
  }

  await delay(220)
  if (!supabase) return mockAuditLogs

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, created_at, action, entity_type, ip_address, severity')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return mockAuditLogs

  return (data as SupabaseAuditLogRecord[]).map((row) => ({
    id: row.id,
    created_at: row.created_at?.replace('T', ' ').slice(0, 16) ?? '-',
    actor_name: 'System',
    actor_org: 'Platform',
    action: row.action,
    entity_type: row.entity_type || '-',
    ip_address: row.ip_address || '-',
    severity: (row.severity || 'info') as AuditLogRow['severity'],
  }))
}

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  if (apiBaseUrl) {
    try {
      return await apiRequest<AnnouncementRow[]>('/api/announcements')
    } catch {
      return mockAnnouncements
    }
  }

  await delay(220)
  if (!supabase) return mockAnnouncements

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, severity, target_type, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) return mockAnnouncements

  return (data as SupabaseAnnouncementRecord[]).map((row) => ({
    id: row.id,
    title: row.title,
    severity: (row.severity || 'info') as AnnouncementRow['severity'],
    target_type: (row.target_type || 'all') as AnnouncementRow['target_type'],
    sent_at: row.created_at?.replace('T', ' ').slice(0, 16) ?? '-',
    read_rate: 0,
  }))
}

export async function createOrganization(input: {
  name: string
  plan: 'free' | 'pro' | 'enterprise'
}) {
  if (apiBaseUrl) {
    await apiRequest<{ ok: boolean }>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return
  }

  if (!supabase) return
  await supabase.from('organizations').insert({ name: input.name, plan: input.plan })
}

export async function saveAnnouncement(input: {
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical'
  target_type: 'all' | 'role' | 'org'
  target_value?: string
  scheduled_for?: string
}) {
  if (apiBaseUrl) {
    await apiRequest<{ ok: boolean }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return
  }

  if (!supabase) return
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('announcements').insert({
    ...input,
    created_by: user?.id ?? null,
  })
}

export async function logActivity(input: {
  action: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
  severity?: 'info' | 'warning' | 'critical'
  org_id?: string
}) {
  if (apiBaseUrl) {
    await apiRequest<{ ok: boolean }>('/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return
  }

  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('activity_logs').insert({
    actor_id: user?.id ?? null,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    metadata: input.metadata,
    severity: input.severity ?? 'info',
  })
}

export async function updateUserRoles(userId: string, roles: Role[]) {
  if (apiBaseUrl) {
    await apiRequest<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    })
    return
  }

  await delay(180)
  await logActivity({
    action: 'user.roles.updated',
    entity_type: 'user',
    entity_id: userId,
    metadata: { roles },
    severity: 'warning',
  })
}
