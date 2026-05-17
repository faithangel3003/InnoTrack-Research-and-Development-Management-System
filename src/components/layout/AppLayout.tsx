import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-[#f7fafc] md:grid md:grid-cols-[13.5rem_1fr]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-0 min-w-0 overflow-y-auto">
        <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-neutral-900/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  )
}
