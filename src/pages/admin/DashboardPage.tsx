import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, ArrowRight, ClipboardList, FolderKanban, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import * as auditLogApi from '../../api/auditLogApi'
import * as projectApi from '../../api/projectApi'
import * as userApi from '../../api/userApi'
import { PageHeader } from '../../components/layout/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ChartContainer } from '../../components/ui/ChartContainer'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, relativeTime } from '../../utils/formatDate'

type DashboardState = {
  loading: boolean
  error: string
  users: userApi.User[]
  totalUsers: number
  projects: projectApi.Project[]
  logs: auditLogApi.AuditLog[]
}

type MetricCardProps = {
  label: string
  value: string
  helper: string
  icon: ReactNode
  iconClassName: string
}

const taskPalette = ['#94a3b8', '#f59e0b', '#10b981', '#ef4444']

function isActiveUser(user: userApi.User) {
  return user.isActive ?? user.status === 'active'
}

function getDisplayName(user: userApi.User) {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function projectStatusVariant(status: string): 'success' | 'warning' | 'neutral' | 'info' {
  const normalized = status.toLowerCase()
  if (normalized === 'completed') return 'success'
  if (normalized === 'active') return 'info'
  if (normalized === 'onhold') return 'warning'
  return 'neutral'
}

function toPercent(completed: number, total: number) {
  if (!total) {
    return 0
  }

  return Math.round((completed / total) * 100)
}

function MetricCard({ label, value, helper, icon, iconClassName }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClassName}`}>
          {icon}
        </span>
      </div>
    </article>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: '',
    users: [],
    totalUsers: 0,
    projects: [],
    logs: [],
  })

  const isSystemAdmin = user?.role === 'SystemAdmin'

  useEffect(() => {
    if (!isSystemAdmin) {
      setState((current) => ({ ...current, loading: false }))
      return
    }

    let cancelled = false

    async function loadDashboard() {
      setState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const [usersResponse, projectsResponse, logsResponse] = await Promise.all([
          userApi.getAllUsers({ page: 1, pageSize: 200 }),
          projectApi.getAllProjects(),
          auditLogApi.getAuditLogs({ page: 1, pageSize: 20 }),
        ])

        if (cancelled) {
          return
        }

        setState({
          loading: false,
          error: '',
          users: usersResponse.data,
          totalUsers: usersResponse.total,
          projects: projectsResponse,
          logs: logsResponse.data,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load dashboard data',
        }))
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [isSystemAdmin])

  const activeUsers = useMemo(() => state.users.filter(isActiveUser).length, [state.users])
  const activeProjects = useMemo(() => state.projects.filter((project) => project.status.toLowerCase() === 'active').length, [state.projects])
  const totalTasks = useMemo(() => state.projects.reduce((sum, project) => sum + project.totalTasks, 0), [state.projects])
  const completedTasks = useMemo(() => state.projects.reduce((sum, project) => sum + project.completedTasks, 0), [state.projects])
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayActivity = useMemo(() => state.logs.filter((log) => new Date(log.timestampUtc) >= today).length, [state.logs, today])

  const projectProgress = useMemo(() => {
    const labelCounts = new Map<string, number>()

    return state.projects
      .slice(0, 6)
      .map((project) => {
        const baseName = project.title.length > 24 ? `${project.title.slice(0, 24)}...` : project.title
        const nextCount = (labelCounts.get(baseName) ?? 0) + 1

        labelCounts.set(baseName, nextCount)

        return {
          id: project.id,
          name: nextCount === 1 ? baseName : `${baseName} (${nextCount})`,
          completion: toPercent(project.completedTasks, project.totalTasks),
        }
      })
  }, [state.projects])

  const taskOverview = useMemo(() => {
    const completed = completedTasks
    const todo = Math.max(0, totalTasks - completed)
    const inProgress = 0
    const overdue = 0

    return [
      { name: 'To Do', value: todo, color: taskPalette[0] },
      { name: 'In Progress', value: inProgress, color: taskPalette[1] },
      { name: 'Completed', value: completed, color: taskPalette[2] },
      { name: 'Overdue', value: overdue, color: taskPalette[3] },
    ]
  }, [completedTasks, totalTasks])

  const recentProjects = useMemo(() => state.projects.slice(0, 4), [state.projects])
  const teamMembers = useMemo(() => state.users.slice(0, 5), [state.users])
  const displayName = user?.firstName || user?.email || 'Administrator'

  if (!isSystemAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="This dashboard is tailored for Organization Administrators. Continue to the workspace assigned to your role."
        />

        <Card title="Workspace Access" subtitle="Use the primary area that matches your permissions.">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(user?.role === 'ProjectManager' ? '/projects' : '/my-tasks')}>
              Open My Workspace
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${displayName}. Here's an overview of your organization's projects, tasks, team members, and administrative activity.`}
        actions={(
          <>
            <Button variant="secondary" onClick={() => navigate('/admin/users')}>
              User Management
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/research-documentation')}>
              Research Documentation
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/collaboration')}>
              Collaboration Center
            </Button>
            <Button onClick={() => navigate('/admin/innovation-analytics')} rightIcon={<ArrowRight size={16} />}>
              Analytics & Reporting
            </Button>
          </>
        )}
      />

      {state.error ? (
        <Card title="Dashboard unavailable" subtitle={state.error}>
          <Button onClick={() => window.location.reload()}>Reload dashboard</Button>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {state.loading ? Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        )) : (
          <>
            <MetricCard
              label="Research Projects"
              value={state.projects.length.toLocaleString()}
              helper={`${activeProjects} active projects in the organization`}
              icon={<FolderKanban size={22} />}
              iconClassName="bg-sky-100 text-sky-600"
            />
            <MetricCard
              label="Task Portfolio"
              value={totalTasks.toLocaleString()}
              helper={`${completedTasks} tasks completed across active workstreams`}
              icon={<ClipboardList size={22} />}
              iconClassName="bg-violet-100 text-violet-600"
            />
            <MetricCard
              label="Team Members"
              value={state.totalUsers.toLocaleString()}
              helper={`${activeUsers} active accounts supporting delivery`}
              icon={<Users size={22} />}
              iconClassName="bg-emerald-100 text-emerald-600"
            />
            <MetricCard
              label="Audit Activity"
              value={todayActivity.toLocaleString()}
              helper={`${state.logs.length} recent events captured for this organization`}
              icon={<Activity size={22} />}
              iconClassName="bg-amber-100 text-amber-600"
            />
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card
          title="Project Progress"
          subtitle="Track completion rates across active research initiatives."
        >
          <div className="h-80">
            {state.loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
            ) : projectProgress.length > 0 ? (
              <ChartContainer className="h-full w-full">
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={projectProgress}
                    layout="vertical"
                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} unit="%" />
                    <YAxis dataKey="name" type="category" width={130} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${Number(value || 0)}%`, 'Completion']} />
                    <Bar dataKey="completion" radius={[10, 10, 10, 10]}>
                      {projectProgress.map((entry) => <Cell key={entry.id} fill={entry.completion >= 70 ? '#10b981' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                )}
              </ChartContainer>
            ) : (
              <EmptyChartState message="Project progress will appear once research initiatives are available in this organization." />
            )}
          </div>
        </Card>

        <Card title="Task Overview" subtitle="Current task distribution across the organization.">
          <div className="space-y-5">
            <div className="relative mx-auto h-72 max-w-sm">
              {state.loading ? (
                <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
              ) : taskOverview.some((item) => item.value > 0) ? (
                <>
                  <ChartContainer className="h-full w-full">
                    {({ width, height }) => (
                      <PieChart width={width} height={height}>
                        <Pie
                          data={taskOverview}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                        >
                          {taskOverview.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => [`${Number(value || 0)} tasks`, 'Tasks']} />
                      </PieChart>
                    )}
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tasks</span>
                    <span className="mt-2 text-4xl font-bold text-slate-900">{totalTasks}</span>
                  </div>
                </>
              ) : (
                <EmptyChartState message="Task distribution will appear once project tasks are available." />
              )}
            </div>

            <div className="grid gap-3">
              {taskOverview.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Recent Projects" subtitle="Latest organization projects and their completion status.">
          <div className="space-y-3">
            {state.loading ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            )) : recentProjects.length > 0 ? recentProjects.map((project) => (
              <div key={project.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.totalTasks} tasks • {project.memberCount} team members</p>
                  </div>
                  <Badge variant={projectStatusVariant(project.status)} text={project.status} />
                </div>
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${toPercent(project.completedTasks, project.totalTasks)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{toPercent(project.completedTasks, project.totalTasks)}% complete</span>
                    <span>Updated {relativeTime(project.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                Organization projects will appear here once your teams start delivering work.
              </div>
            )}
          </div>
        </Card>

        <Card title="Team Members" subtitle="A quick view of active workspace members and assigned roles.">
          <div className="space-y-3">
            {state.loading ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            )) : teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={getDisplayName(member)} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getDisplayName(member)}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={isActiveUser(member) ? 'success' : 'neutral'} text={isActiveUser(member) ? 'Active' : 'Inactive'} />
                  <p className="mt-2 text-xs text-slate-500">{member.roleName || 'Unassigned'}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(member.lastLogin || member.updatedAtUtc || member.createdAtUtc)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Activity" subtitle="Organization log activity across enabled modules.">
          <div className="space-y-3">
            {state.loading ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            )) : state.logs.slice(0, 4).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.module || 'General'} • {relativeTime(log.timestampUtc)}</p>
                  </div>
                  <Badge variant="info" text="Logged" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
