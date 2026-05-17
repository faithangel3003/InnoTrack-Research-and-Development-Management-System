import { format } from 'date-fns'
import { Monitor } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/companies': 'Companies',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/payments': 'Payments',
  '/admin/reports': 'Reports',
  '/admin/settings': 'Settings',
}

function getInitials(firstName?: string, lastName?: string, email?: string) {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'SA'
  }

  return email?.slice(0, 2).toUpperCase() || 'SA'
}

export function SuperAdminTopbar() {
  const location = useLocation()
  const { user } = useAuth()
  const title = pageTitles[location.pathname] || 'InnoTrack'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Maria Torres'
  const role = user?.role === 'SuperAdmin' ? 'Super Administrator' : user?.role || 'Super Administrator'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4 text-right">
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-sm text-slate-400">{format(new Date(), 'EEEE, MMM dd, yyyy')}</span>
          <Monitor className="h-4 w-4 text-slate-400" />
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
          {getInitials(user?.firstName, user?.lastName, user?.email)}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-800">{fullName}</div>
          <div className="text-xs text-slate-400">{role}</div>
        </div>
      </div>
    </header>
  )
}