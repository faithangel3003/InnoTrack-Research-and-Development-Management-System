import { useAuth } from '../../hooks/useAuth'

export function SettingsPage() {
  const { user, token, logout } = useAuth()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">Current session and environment details</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Session</h3>
          <dl className="mt-4 space-y-4 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">User</dt>
              <dd className="mt-1">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Unknown user'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Email</dt>
              <dd className="mt-1">{user?.email || 'Unavailable'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Role</dt>
              <dd className="mt-1">{user?.role || 'Unavailable'}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Environment</h3>
          <dl className="mt-4 space-y-4 text-sm text-slate-700">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">API Base URL</dt>
              <dd className="mt-1 break-all">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:5110/api'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Token Present</dt>
              <dd className="mt-1">{token ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <button type="button" onClick={() => void logout()} className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100">
            Logout
          </button>
        </section>
      </div>
    </div>
  )
}