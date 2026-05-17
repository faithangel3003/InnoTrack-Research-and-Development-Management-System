import { BarChart3, CalendarDays, CheckSquare, CreditCard, FileText, Files, FolderKanban, LayoutDashboard, LogOut, MessageSquare, Settings, Users, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { classNames } from '../../utils/classNames'
import { BrandMark } from '../ui/BrandMark'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

type NavItem = {
  section: 'main' | 'management' | 'general'
  label: string
  path: string
  icon: ComponentType<{ size?: number }>
  roles: string[]
  pathByRole?: Partial<Record<string, string>>
}

type SectionGroup = {
  key: string
  label: string
  items: NavItem[]
}

const items: NavItem[] = [
  { section: 'main', label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember'] },
  {
    section: 'main',
    label: 'Projects',
    path: '/admin/projects',
    pathByRole: { ProjectManager: '/projects' },
    icon: FolderKanban,
    roles: ['SystemAdmin', 'ProjectManager'],
  },
  {
    section: 'main',
    label: 'Tasks',
    path: '/admin/tasks',
    pathByRole: { ProjectManager: '/admin/tasks', TeamMember: '/my-tasks' },
    icon: CheckSquare,
    roles: ['SystemAdmin', 'ProjectManager', 'TeamMember'],
  },
  { section: 'main', label: 'Research Documentation', path: '/admin/research-documentation', icon: Files, roles: ['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember'] },
  { section: 'main', label: 'Calendar', path: '/admin/calendar', icon: CalendarDays, roles: ['SystemAdmin'] },
  { section: 'management', label: 'Reports', path: '/admin/reports', icon: BarChart3, roles: ['SystemAdmin'] },
  { section: 'management', label: 'Collaboration', path: '/admin/collaboration', icon: MessageSquare, roles: ['SystemAdmin', 'ProjectManager', 'TeamMember'] },
  { section: 'management', label: 'User Management', path: '/admin/users', icon: Users, roles: ['SuperAdmin', 'SystemAdmin'] },
  { section: 'management', label: 'Audit Log', path: '/admin/audit-logs', icon: FileText, roles: ['SuperAdmin', 'SystemAdmin'] },
  { section: 'management', label: 'Subscription', path: '/admin/subscription', icon: CreditCard, roles: ['SystemAdmin'] },
  { section: 'management', label: 'Innovation Analytics', path: '/admin/innovation-analytics', icon: BarChart3, roles: ['SystemAdmin'] },
  { section: 'general', label: 'Settings', path: '/admin/settings', icon: Settings, roles: ['SuperAdmin', 'SystemAdmin', 'ProjectManager', 'TeamMember'] },
]

const sections = [
  { key: 'main', label: 'Main Menu' },
  { key: 'management', label: 'Management' },
  { key: 'general', label: 'General' },
] as const

function resolvePath(item: NavItem, role: string) {
  return item.pathByRole?.[role] || item.path
}

function buildSectionGroups(role: string, visibleItems: NavItem[]): SectionGroup[] {
  if (role === 'TeamMember') {
    return visibleItems.length > 0
      ? [{ key: 'team-workspace', label: 'Team Workspace', items: visibleItems }]
      : []
  }

  return sections
    .map((section) => ({
      key: section.key,
      label: section.label,
      items: visibleItems.filter((item) => item.section === section.key),
    }))
    .filter((section) => section.items.length > 0)
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const role = user?.role || 'TeamMember'

  const visibleItems = items.filter((item) => item.roles.includes(role))
  const footerItems = role === 'TeamMember'
    ? visibleItems.filter((item) => item.section === 'general')
    : []
  const contentItems = role === 'TeamMember'
    ? visibleItems.filter((item) => item.section !== 'general')
    : visibleItems
  const sectionGroups = buildSectionGroups(role, contentItems)

  return (
    <aside className={classNames('fixed inset-y-0 left-0 z-30 w-[13.5rem] border-r border-slate-200 bg-white transition-transform md:static md:h-screen md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-full flex-col">
        <div className="flex h-[4.5rem] items-center justify-between border-b border-slate-200 px-4">
          <BrandMark
            subtitle="R&D workspace"
            badgeClassName="h-9 w-9 rounded-full bg-sky-50 text-sky-700"
            fallbackClassName="text-[0.65rem] text-sky-700"
            titleClassName="text-lg font-semibold text-slate-900"
            subtitleClassName="text-[11px] text-slate-400"
          />

          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {role === 'TeamMember' ? (
            <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Focused Access</p>
              <p className="mt-2 text-sm leading-5 text-sky-900">
                Your workspace shows only the modules available to Team Members.
              </p>
            </div>
          ) : null}

          {sectionGroups.map((section) => {
            if (section.items.length === 0) {
              return null
            }

            return (
              <div key={section.key} className="mb-7 last:mb-0">
                <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {section.label}
                </p>

                <nav className="space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const path = resolvePath(item, role)
                    const active = location.pathname === path || location.pathname.startsWith(`${path}/`)

                    return (
                      <Link
                        key={`${section.key}-${path}`}
                        to={path}
                        onClick={onClose}
                        className={classNames(
                          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-sky-900 text-white shadow-[0_10px_24px_rgba(12,74,110,0.18)]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon size={17} />
                        <span className="leading-5">{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )
          })}
        </div>

        <div className="shrink-0 border-t border-slate-200 px-3 py-4">
          {footerItems.length > 0 ? (
            <>
              <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                General
              </p>

              <nav className="mb-3 space-y-1.5">
                {footerItems.map((item) => {
                  const Icon = item.icon
                  const path = resolvePath(item, role)
                  const active = location.pathname === path || location.pathname.startsWith(`${path}/`)

                  return (
                    <Link
                      key={`footer-${path}`}
                      to={path}
                      onClick={onClose}
                      className={classNames(
                        'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sky-900 text-white shadow-[0_10px_24px_rgba(12,74,110,0.18)]'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <Icon size={17} />
                      <span className="leading-5">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose()
              void logout()
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
