import type { User } from '../../api/userApi'
import { EmptyState } from '../ui/EmptyState'
import { UserTableRow } from './UserTableRow'

type UserTableProps = {
  users: User[]
  loading: boolean
  canChangeRole: boolean
  onView: (user: User) => void
  onEdit: (id: string) => void
  onDeactivate: (user: User) => void
  onChangeRole: (user: User) => void
}

export function UserTable({ users, loading, canChangeRole, onView, onEdit, onDeactivate, onChangeRole }: UserTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (!users.length) {
    return <EmptyState title="No users found" message="Try changing filters or create a new user." />
  }

  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 bg-white">
        <thead>
          <tr>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">User</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Role</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Projects</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tasks</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
            <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Last Login</th>
            <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              canChangeRole={canChangeRole}
              onView={onView}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onChangeRole={onChangeRole}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
