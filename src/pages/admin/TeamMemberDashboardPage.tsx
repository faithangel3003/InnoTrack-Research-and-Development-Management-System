import { Bell, BookOpen, CheckCircle2, Clock3, MessageSquare, Settings, SquareCheckBig } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as collaborationApi from '../../api/collaborationApi'
import * as taskApi from '../../api/taskApi'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatDate'

type TeamMemberDashboardState = {
  loading: boolean
  error: string
  tasks: taskApi.ProjectTask[]
  notifications: collaborationApi.CollaborationNotification[]
}

const moduleCards = [
  {
    title: 'My Tasks',
    subtitle: 'Track assignments, update status, and close completed work.',
    path: '/my-tasks',
    icon: SquareCheckBig,
  },
  {
    title: 'Research Documentation',
    subtitle: 'Upload and manage project files and references.',
    path: '/admin/research-documentation',
    icon: BookOpen,
  },
  {
    title: 'Collaboration',
    subtitle: 'Coordinate with your team through channels and announcements.',
    path: '/admin/collaboration',
    icon: MessageSquare,
  },
  {
    title: 'Settings',
    subtitle: 'Manage your profile and workspace preferences.',
    path: '/admin/settings',
    icon: Settings,
  },
]

function taskStatusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function TeamMemberDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<TeamMemberDashboardState>({
    loading: true,
    error: '',
    tasks: [],
    notifications: [],
  })
  const [referenceNow, setReferenceNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const [tasks, notifications] = await Promise.all([
          taskApi.getMyTasks(),
          collaborationApi.getNotifications().catch(() => []),
        ])

        if (cancelled) {
          return
        }

        setState({
          loading: false,
          error: '',
          tasks,
          notifications,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load team member dashboard data',
          tasks: [],
          notifications: [],
        })
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setReferenceNow(Date.now())
  }, [state.tasks])

  const weekAhead = referenceNow + 7 * 24 * 60 * 60 * 1000

  const taskStats = useMemo(() => {
    const completed = state.tasks.filter((task) => task.status === 'Done').length
    const inProgress = state.tasks.filter((task) => task.status === 'InProgress').length
    const dueSoon = state.tasks.filter((task) => {
      if (task.status === 'Done') return false
      const due = new Date(task.dueDate).getTime()
      return due >= referenceNow && due <= weekAhead
    }).length

    return {
      total: state.tasks.length,
      completed,
      inProgress,
      dueSoon,
    }
  }, [referenceNow, state.tasks, weekAhead])

  const unreadNotifications = useMemo(() => state.notifications.filter((notification) => notification.unread).length, [state.notifications])

  const upcomingTasks = useMemo(() => {
    return [...state.tasks]
      .filter((task) => task.status !== 'Done')
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
      .slice(0, 5)
  }, [state.tasks])

  const recentNotifications = useMemo(() => {
    return [...state.notifications]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5)
  }, [state.notifications])

  return (
    <div className="space-y-6">
      <PageHeader
        title=""
        subtitle={`Welcome back, ${user?.firstName || user?.email || 'Team Member'}. Access your role-based modules and stay on top of assigned work.`}
        actions={(
          <Button onClick={() => navigate('/my-tasks')} rightIcon={<SquareCheckBig size={16} />}>
            Open My Tasks
          </Button>
        )}
      />

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card title="Assigned" subtitle="Total tasks assigned to you">
          <p className="text-3xl font-semibold text-slate-900">{taskStats.total}</p>
        </Card>
        <Card title="In Progress" subtitle="Tasks actively moving">
          <p className="text-3xl font-semibold text-amber-600">{taskStats.inProgress}</p>
        </Card>
        <Card title="Completed" subtitle="Tasks finished">
          <p className="text-3xl font-semibold text-emerald-600">{taskStats.completed}</p>
        </Card>
        <Card title="Due In 7 Days" subtitle="Upcoming task deadlines">
          <p className="text-3xl font-semibold text-sky-600">{taskStats.dueSoon}</p>
        </Card>
        <Card title="Unread Alerts" subtitle="Collaboration notifications">
          <div className="flex items-center justify-between gap-3">
            <p className="text-3xl font-semibold text-violet-600">{unreadNotifications}</p>
            <Bell className="text-violet-500" size={20} />
          </div>
        </Card>
      </section>

      <Card title="Role-Based Modules" subtitle="These modules are available for the Team Member role.">
        <div className="grid gap-4 md:grid-cols-2">
          {moduleCards.map((moduleCard) => {
            const Icon = moduleCard.icon

            return (
              <button
                key={moduleCard.path}
                type="button"
                onClick={() => navigate(moduleCard.path)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{moduleCard.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{moduleCard.subtitle}</p>
                  </div>
                  <span className="rounded-xl bg-white p-2 text-sky-600 shadow-sm">
                    <Icon size={18} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card title="Upcoming Tasks" subtitle="Your next work items by due date.">
          {state.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : upcomingTasks.length === 0 ? (
            <EmptyState title="No upcoming tasks" message="You are currently clear on pending due dates." />
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Due {formatDate(task.dueDate)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {taskStatusLabel(task.status)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Notifications" subtitle="Latest collaboration alerts for your workspace.">
          {state.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <EmptyState title="No notifications yet" message="New mentions, messages, and updates will appear here." />
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <article key={notification.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                    </div>
                    {notification.unread ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">New</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card title="Need A Quick Update?" subtitle="Jump straight to your active task board.">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => navigate('/my-tasks')} leftIcon={<CheckCircle2 size={16} />}>
            Go To Task Board
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/collaboration')} leftIcon={<MessageSquare size={16} />}>
            Open Collaboration
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/research-documentation')} leftIcon={<Clock3 size={16} />}>
            Open Documents
          </Button>
        </div>
      </Card>
    </div>
  )
}