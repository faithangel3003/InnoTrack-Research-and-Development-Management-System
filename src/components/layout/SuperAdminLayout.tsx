import { useState, type ReactNode } from 'react'
import { SuperAdminSidebar } from './SuperAdminSidebar'
import { SuperAdminTopbar } from './SuperAdminTopbar'

type SuperAdminLayoutProps = {
  children: ReactNode
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 lg:grid" style={{ gridTemplateColumns: collapsed ? '4rem 1fr' : '16rem 1fr' }}>
      <SuperAdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />
      <div className="min-w-0">
        <SuperAdminTopbar />
        <main className="space-y-6 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}