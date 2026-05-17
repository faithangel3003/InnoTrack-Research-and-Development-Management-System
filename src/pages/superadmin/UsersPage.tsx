import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, CardTitle, Input } from '../../components/ui'
import { getUsers, logActivity, updateUserRoles } from '../../lib/api'
import type { Role, UserRow } from '../../lib/types'

const roleOptions: Role[] = ['super_admin', 'system_admin', 'project_manager', 'team_member']

export function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const roleMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: Role[] }) => {
      await updateUserRoles(userId, roles)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const users = (usersQuery.data ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <section>
      <div className="page-header row">
        <div>
          <h1>Users & Roles</h1>
          <p>Global user directory with role management and bulk actions.</p>
        </div>
        <div className="inline-actions">
          <Button
            className="button-ghost"
            onClick={async () => {
              if (confirm('Deactivate selected users?')) {
                await logActivity({ action: 'users.bulk_deactivated', entity_type: 'user', severity: 'critical' })
              }
            }}
          >
            Deactivate
          </Button>
          <Button
            className="button-ghost"
            onClick={async () => {
              await logActivity({ action: 'users.bulk_password_reset.sent', entity_type: 'user', severity: 'warning' })
            }}
          >
            Send Password Reset
          </Button>
          <Button
            className="button-ghost"
            onClick={async () => {
              await logActivity({ action: 'users.csv_exported', entity_type: 'user' })
            }}
          >
            Export CSV
          </Button>
          <Button>Invite User</Button>
        </div>
      </div>

      <Card className="filters-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
      </Card>

      <Card>
        <CardTitle>User Directory</CardTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Organization</th>
                <th>Roles</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} onClick={() => setSelectedUser(user)}>
                  <td>
                    <div className="user-cell">
                      <img src={user.avatarUrl || `https://api.dicebear.com/9.x/adventurer/svg?seed=${user.name}`} alt={user.name} />
                      <div>
                        <strong>{user.name}</strong>
                        <p>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>{user.organization}</td>
                  <td>
                    <select
                      className="input"
                      defaultValue={user.roles[0]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        const nextRole = e.target.value as Role
                        await roleMutation.mutateAsync({ userId: user.id, roles: [nextRole] })
                      }}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{user.lastLogin}</td>
                  <td>
                    <span className={`badge ${user.status}`}>{user.status}</span>
                  </td>
                  <td>
                    <Button
                      className="button-ghost"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await logActivity({ action: 'user.password_reset.sent', entity_type: 'user', entity_id: user.id })
                      }}
                    >
                      Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedUser && (
        <aside className="sheet" aria-label="User detail drawer">
          <div className="sheet-head">
            <h3>{selectedUser.name}</h3>
            <Button className="button-ghost" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </div>
          <p>Email: {selectedUser.email}</p>
          <p>Organization: {selectedUser.organization}</p>
          <p>Roles: {selectedUser.roles.join(', ')}</p>
          <p>Last Login: {selectedUser.lastLogin}</p>
          <div className="divider" />
          <p>Recent audit trail and projects are shown here in full detail.</p>
        </aside>
      )}
    </section>
  )
}
