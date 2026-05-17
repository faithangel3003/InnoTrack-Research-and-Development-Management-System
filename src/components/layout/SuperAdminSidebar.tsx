import {
  Building2,
  ChevronLeft,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { BrandMark } from '../ui/BrandMark'

type SuperAdminSidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

const menuItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
]

export function SuperAdminSidebar({ collapsed, onToggle }: SuperAdminSidebarProps) {
  const { logout } = useAuth()

  return (
    <aside className={`sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-slate-100 bg-white transition-all duration-200 lg:flex ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Brand header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
        <BrandMark
          showText={!collapsed}
          badgeClassName="h-10 w-10 rounded-xl bg-slate-100 text-slate-900"
          fallbackClassName="text-[0.65rem] text-slate-900"
          titleClassName="text-lg font-bold text-slate-900"
        />
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 ${collapsed ? 'rotate-180' : ''}`}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav — grows to fill space, no scroll */}
      <div className="flex-1 overflow-hidden px-3 py-6">
        {!collapsed ? <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Menu</p> : null}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Bottom — Settings + Logout always visible */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-4">
        {!collapsed ? <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">General</p> : null}
        <nav className="space-y-1">
          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed ? <span>Settings</span> : null}
          </NavLink>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </nav>
      </div>
    </aside>
  )
}