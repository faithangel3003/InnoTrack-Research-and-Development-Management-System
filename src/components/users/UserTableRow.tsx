import { Ban, Pencil, Shield } from 'lucide-react'
import type { User } from '../../api/userApi'
import { classNames } from '../../utils/classNames'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from './RoleBadge'

type UserTableRowProps = {
  user: User
  canChangeRole: boolean
  onView: (user: User) => void
  onEdit: (id: string) => void
  onDeactivate: (user: User) => void
  onChangeRole: (user: User) => void
}

export function UserTableRow({ user, canChangeRole, onView, onEdit, onDeactivate, onChangeRole }: UserTableRowProps) {
  const fullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
  const isActive = user.isActive ?? user.status === 'active'
  const lastSeen = user.lastLogin || user.updatedAtUtc || user.createdAtUtc
  const lastSeenLabel = lastSeen ? new Date(lastSeen).toLocaleDateString('en-US') : 'Never'

  return (
    <tr
      className="cursor-pointer transition hover:bg-slate-50/80"
      onClick={() => onView(user)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onView(user)
        }
      }}
      tabIndex={0}
      role="button"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={fullName} size="md" />
          <div>
            <p className="font-semibold text-slate-900">{fullName}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><RoleBadge role={user.roleName || ''} appearance="text" /></td>
      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{user.teamName || 'No team'}</p>
          <p className="text-xs text-slate-400">{user.organizationName || 'Company tenant'}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{user.projectCount ?? 0}</td>
      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{user.taskCount ?? 0}</td>
      <td className="px-4 py-4">
        <span className={classNames('inline-flex items-center gap-2 text-sm font-medium', isActive ? 'text-emerald-600' : 'text-rose-600')}>
          <span className={classNames('h-2.5 w-2.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-slate-500">{lastSeenLabel}</td>
      <td className="px-4 py-4">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(user.id)
            }}
            title="Edit user"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil size={16} />
          </button>
          {canChangeRole ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onChangeRole(user)
              }}
              title="Change role"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Shield size={16} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDeactivate(user)
            }}
            title={isActive ? 'Deactivate user' : 'User inactive'}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
          >
            <Ban size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}
