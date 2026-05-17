import { format } from 'date-fns'
import { Bell, BookOpen, CheckSquare, Menu } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as collaborationApi from '../../api/collaborationApi'
import * as taskApi from '../../api/taskApi'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../hooks/useAuth'

type TopbarProps = {
  onToggleSidebar: () => void
}

type TeamMemberShortcutState = {
  openTasks: number
  notifications: collaborationApi.CollaborationNotification[]
  unreadNotifications: number
}

const TEAM_MEMBER_TASKS_UPDATED_EVENT = 'innotrack:team-member-tasks-updated'

const routeTitles = [
  { path: '/admin/users', title: 'User Management' },
  { path: '/admin/projects', title: 'Projects' },
  { path: '/admin/tasks', title: 'Tasks' },
  { path: '/admin/calendar', title: 'Calendar' },
  { path: '/admin/reports', title: 'Reports' },
  { path: '/admin/collaboration', title: 'Collaboration & Communication Services' },
  { path: '/admin/subscription', title: 'My Subscription' },
  { path: '/admin/settings', title: 'Settings' },
  { path: '/admin/research-documentation', title: 'Research Documentation & File Management Services' },
  { path: '/admin/innovation-analytics', title: 'Innovation Analytics & Reporting Services' },
  { path: '/admin/audit-logs', title: 'Audit Log' },
  { path: '/admin/dashboard', title: 'Dashboard' },
  { path: '/projects', title: 'Projects' },
  { path: '/my-tasks', title: 'Tasks' },
]

function toRecentNotifications(notifications: collaborationApi.CollaborationNotification[]) {
  return [...notifications]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6)
}

function resolveNotificationDestination(notification: collaborationApi.CollaborationNotification, role?: string) {
  const taskReferenceTypes = new Set(['Task', 'ProjectTask'])
  const documentReferenceTypes = new Set(['Document', 'ResearchDocument'])
  const taskPath = role === 'TeamMember' ? '/my-tasks' : '/admin/tasks'

  if (notification.kind === 'task' || taskReferenceTypes.has(notification.referenceType || '')) {
    const search = notification.referenceId ? `?taskId=${encodeURIComponent(notification.referenceId)}` : ''
    return {
      path: taskPath,
      search,
      label: 'Open task',
    }
  }

  if (notification.kind === 'document' || documentReferenceTypes.has(notification.referenceType || '')) {
    const search = notification.referenceId ? `?documentId=${encodeURIComponent(notification.referenceId)}` : ''
    return {
      path: '/admin/research-documentation',
      search,
      label: 'Open document',
    }
  }

  const params = new URLSearchParams()
  params.set('notificationId', notification.id)
  if (notification.kind) {
    params.set('kind', notification.kind)
  }
  if (notification.referenceId) {
    params.set('referenceId', notification.referenceId)
  }
  if (notification.referenceType) {
    params.set('referenceType', notification.referenceType)
  }

  return {
    path: '/admin/collaboration',
    search: `?${params.toString()}`,
    label: notification.kind === 'announcement' ? 'Open announcement feed' : 'Open collaboration',
  }
}

function resolveTitle(pathname: string, role?: string) {
  if (pathname.startsWith('/admin/dashboard') && role === 'TeamMember') {
    return 'Team Member Dashboard'
  }

  return routeTitles.find((item) => pathname.startsWith(item.path))?.title || 'Workspace'
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notificationMenuRef = useRef<HTMLDivElement | null>(null)
  const [teamMemberShortcuts, setTeamMemberShortcuts] = useState<TeamMemberShortcutState>({
    openTasks: 0,
    notifications: [],
    unreadNotifications: 0,
  })
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
  const title = resolveTitle(location.pathname, user?.role)
  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), [])
  const isTeamMember = user?.role === 'TeamMember'
  const canViewNotifications = Boolean(user)
  const roleLabel = user?.role === 'SystemAdmin'
    ? 'Organization Admin'
    : user?.role === 'SuperAdmin'
      ? 'Super Administrator'
      : user?.role || 'Workspace Member'

  useEffect(() => {
    if (!canViewNotifications) {
      setTeamMemberShortcuts({ openTasks: 0, notifications: [], unreadNotifications: 0 })
      return
    }

    let cancelled = false
    let disconnect: (() => Promise<void>) | undefined

    async function loadCounts() {
      try {
        const [notifications, tasks] = await Promise.all([
          collaborationApi.getNotifications().catch(() => []),
          isTeamMember ? taskApi.getMyTasks().catch(() => []) : Promise.resolve([]),
        ])

        if (cancelled) {
          return
        }

        setTeamMemberShortcuts({
          openTasks: isTeamMember ? tasks.filter((task) => task.status !== 'Done').length : 0,
          notifications: toRecentNotifications(notifications),
          unreadNotifications: notifications.filter((notification) => notification.unread).length,
        })
      } catch {
        if (!cancelled) {
          setTeamMemberShortcuts({ openTasks: 0, notifications: [], unreadNotifications: 0 })
        }
      }
    }

    async function connectRealtime() {
      disconnect = await collaborationApi.connectCollaborationHub({
        onNotificationReceived: (notification) => {
          if (cancelled) {
            return
          }

          setTeamMemberShortcuts((current) => {
            const existingNotification = current.notifications.find((entry) => entry.id === notification.id)
            const notifications = toRecentNotifications([notification, ...current.notifications.filter((entry) => entry.id !== notification.id)])

            return {
              openTasks: current.openTasks,
              notifications,
              unreadNotifications: Math.max(0, current.unreadNotifications - (existingNotification?.unread ? 1 : 0) + (notification.unread ? 1 : 0)),
            }
          })

          if (isTeamMember && notification.kind === 'task') {
            void taskApi.getMyTasks()
              .then((tasks) => {
                if (!cancelled) {
                  setTeamMemberShortcuts((current) => ({
                    ...current,
                    openTasks: tasks.filter((task) => task.status !== 'Done').length,
                  }))
                }
              })
              .catch(() => {
                // ignore background task count refresh failures in the topbar surface
              })
          }
        },
      })
    }

    function handleTaskSync() {
      void loadCounts()
    }

    if (isTeamMember) {
      window.addEventListener(TEAM_MEMBER_TASKS_UPDATED_EVENT, handleTaskSync)
    }

    void loadCounts()
    void connectRealtime()

    return () => {
      cancelled = true
      if (isTeamMember) {
        window.removeEventListener(TEAM_MEMBER_TASKS_UPDATED_EVENT, handleTaskSync)
      }
      if (disconnect) {
        void disconnect()
      }
    }
  }, [canViewNotifications, isTeamMember, location.pathname])

  useEffect(() => {
    setNotificationMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!notificationMenuOpen) {
      return
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!notificationMenuRef.current) {
        return
      }

      if (event.target instanceof Node && !notificationMenuRef.current.contains(event.target)) {
        setNotificationMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notificationMenuOpen])

  const recentNotifications = useMemo(() => teamMemberShortcuts.notifications.slice(0, 5), [teamMemberShortcuts.notifications])

  async function handleNotificationClick(notification: collaborationApi.CollaborationNotification) {
    try {
      const updated = await collaborationApi.markNotificationRead(notification.id)
      setTeamMemberShortcuts((current) => {
        const existingNotification = current.notifications.find((entry) => entry.id === updated.id)
        const notifications = current.notifications.map((entry) => entry.id === updated.id ? updated : entry)

        return {
          ...current,
          notifications,
          unreadNotifications: Math.max(0, current.unreadNotifications - (existingNotification?.unread ? 1 : 0)),
        }
      })
    } catch {
      // ignore read errors in the topbar shortcut surface
    }

    setNotificationMenuOpen(false)

    const destination = resolveNotificationDestination(notification, user?.role)
    navigate({ pathname: destination.path, search: destination.search })
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await collaborationApi.markAllNotificationsRead()
      setTeamMemberShortcuts((current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({ ...notification, unread: false })),
        unreadNotifications: 0,
      }))
    } catch {
      // ignore mark-all errors in the compact topbar surface
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button type="button" className="rounded-2xl border border-slate-200 p-2 text-slate-500 md:hidden" onClick={onToggleSidebar}>
          <Menu size={18} />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 text-sm text-slate-400 lg:flex">
          <span>{today}</span>
          <span className="h-5 w-px bg-slate-200" />
        </div>

        {isTeamMember ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/my-tasks')}
              className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
            >
              <CheckSquare size={16} className="text-sky-600" />
              <span>{teamMemberShortcuts.openTasks} Open Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/my-tasks')}
              className="hidden rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:flex md:hidden"
              aria-label="Open my tasks"
            >
              <CheckSquare size={18} />
            </button>
          </>
        ) : null}

        {canViewNotifications ? (
          <>
            <div ref={notificationMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationMenuOpen((current) => !current)}
                className="relative hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:flex"
              >
                <Bell size={16} className="text-violet-600" />
                <span>{teamMemberShortcuts.unreadNotifications} Alerts</span>
                {teamMemberShortcuts.unreadNotifications > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                    {teamMemberShortcuts.unreadNotifications}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setNotificationMenuOpen((current) => !current)}
                className="relative rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 md:hidden"
                aria-label="Open alerts"
              >
                <Bell size={18} />
                {teamMemberShortcuts.unreadNotifications > 0 ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
                ) : null}
              </button>

              {notificationMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[20rem] rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-500">Latest collaboration and task updates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleMarkAllNotificationsRead()}
                      className="text-xs font-semibold text-sky-700 transition hover:text-sky-900"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentNotifications.length > 0 ? recentNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => void handleNotificationClick(notification)}
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{notification.body}</p>
                            <span className="mt-2 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {resolveNotificationDestination(notification, user?.role).label}
                            </span>
                            <p className="mt-2 text-[11px] text-slate-400">{format(new Date(notification.createdAt), 'MMM d, h:mm a')}</p>
                          </div>
                          {notification.unread ? (
                            <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                          ) : null}
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {!isTeamMember ? (
              <button
                type="button"
                onClick={() => navigate('/admin/research-documentation')}
                className="hidden rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:flex"
                aria-label="Open research documentation"
              >
                <BookOpen size={18} />
              </button>
            ) : null}
          </>
        ) : null}

        <div className="flex items-center gap-2">
          <Avatar name={fullName} size="sm" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{fullName}</p>
            <p className="text-xs text-slate-400">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
