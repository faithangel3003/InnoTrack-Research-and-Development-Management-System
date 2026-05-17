import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as projectApi from '../../api/projectApi'
import type { User } from '../../api/userApi'
import { TeamManagementSection } from '../../components/users/TeamManagementSection'
import { UserFilters } from '../../components/users/UserFilters'
import { UserStatsCards } from '../../components/users/UserStatsCards'
import { UserTable } from '../../components/users/UserTable'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { RoleBadge } from '../../components/users/RoleBadge'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useRoles } from '../../hooks/useRoles'
import { useUsers } from '../../hooks/useUsers'
import { normalizeRole } from '../../utils/roleHelpers'

export function UsersPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { roles } = useRoles()
  const { users, total, page, pageSize, totalPages, loading, error, filters, setFilters, setPage, fetchUsers, deactivateUser, changeRole } = useUsers()

  const [viewUser, setViewUser] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogLoading, setDialogLoading] = useState(false)
  const [roleDialogUser, setRoleDialogUser] = useState<User | null>(null)
  const [nextRoleId, setNextRoleId] = useState('')
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [projectMembersByProjectId, setProjectMembersByProjectId] = useState<Record<string, projectApi.ProjectMember[]>>({})
  const [projectError, setProjectError] = useState('')
  const canManageTeams = ['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(user?.role))

  const assignableRoles = useMemo(
    () => roles.filter((role) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(role.roleName))),
    [roles],
  )

  const visibleUsers = useMemo(
    () => users.filter((entry) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(entry.roleName))),
    [users],
  )

  useEffect(() => {
    let active = true

    async function loadProjects() {
      try {
        const data = await projectApi.getAllProjects()
        const memberEntries = await Promise.all(
          data.map(async (project) => {
            try {
              const members = await projectApi.getProjectMembers(project.id)
              return [project.id, members] as const
            } catch {
              return [project.id, []] as const
            }
          }),
        )

        if (!active) {
          return
        }

        setProjects(data)
        setProjectMembersByProjectId(Object.fromEntries(memberEntries))
        setProjectError('')
      } catch (projectLoadError) {
        if (!active) {
          return
        }
        setProjects([])
        setProjectMembersByProjectId({})
        setProjectError(projectLoadError instanceof Error ? projectLoadError.message : 'Failed to load project workload.')
      }
    }

    void loadProjects()

    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const active = visibleUsers.filter((entry) => entry.isActive ?? entry.status === 'active').length
    return {
      totalUsers: visibleUsers.length,
      activeUsers: active,
      projectManagers: visibleUsers.filter((entry) => normalizeRole(entry.roleName) === 'ProjectManager').length,
      teamMembers: visibleUsers.filter((entry) => normalizeRole(entry.roleName) === 'TeamMember').length,
    }
  }, [visibleUsers])

  const usersWithMetrics = useMemo(() => {
    return visibleUsers.map((entry) => {
      const assignedProjects = projects.filter((project) => {
        const members = projectMembersByProjectId[project.id] || []
        return project.createdByUserId === entry.id || members.some((member) => member.userId === entry.id)
      })

      return {
        ...entry,
        projectCount: assignedProjects.length,
        taskCount: assignedProjects.reduce((sum, project) => sum + project.totalTasks, 0),
      }
    })
  }, [projectMembersByProjectId, projects, visibleUsers])

  const visibleRangeEnd = Math.min(page * pageSize, total)
  const visibleRangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1

  async function confirmDeactivate() {
    if (!selectedUser) return
    setDialogLoading(true)
    const toastId = toast.loading('Updating user status...')
    try {
      await deactivateUser(selectedUser.id)
      toast.dismiss(toastId)
      toast.success('User updated successfully')
      setSelectedUser(null)
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setDialogLoading(false)
    }
  }

  async function confirmChangeRole() {
    if (!roleDialogUser || !nextRoleId) return

    const toastId = toast.loading('Updating role...')
    try {
      await changeRole(roleDialogUser.id, Number(nextRoleId))
      toast.dismiss(toastId)
      toast.success('User role updated successfully')
      setRoleDialogUser(null)
      setNextRoleId('')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to change role')
    }
  }

  return (
    <div className="space-y-6">
      <UserStatsCards {...stats} />

      <UserFilters
        roles={assignableRoles}
        filters={filters}
        onChange={(nextFilters) => setFilters(nextFilters)}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/admin/users/create')}>
            Add User
          </Button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {projectError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {projectError}
        </div>
      ) : null}

      <Card
        className="overflow-hidden"
        padding="sm"
      >
        <UserTable
          users={usersWithMetrics}
          loading={loading}
          canChangeRole={['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(user?.role))}
          onView={setViewUser}
          onEdit={(id) => navigate(`/admin/users/${id}/edit`)}
          onDeactivate={(target) => setSelectedUser(target)}
          onChangeRole={(target) => {
            setRoleDialogUser(target)
            setNextRoleId(target.roleId ? String(target.roleId) : '')
          }}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-sm text-slate-500">
            Showing {visibleRangeStart}-{visibleRangeEnd} of {total} users
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={(nextPage) => {
              setPage(nextPage)
              void fetchUsers({ page: nextPage })
            }}
          />
        </div>
      </Card>

      {canManageTeams ? <TeamManagementSection /> : null}

      <ConfirmDialog
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${selectedUser?.name || selectedUser?.email || 'this user'}? They will lose system access.`}
        confirmText="Yes, Deactivate"
        confirmVariant="danger"
        loading={dialogLoading}
      />

      <Modal
        isOpen={!!roleDialogUser}
        onClose={() => {
          setRoleDialogUser(null)
          setNextRoleId('')
        }}
        title="Change User Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Update role for {roleDialogUser?.name || roleDialogUser?.email || 'selected user'}.
          </p>
          <Select
            label="Role"
            options={[
              { value: '', label: 'Select role' },
              ...assignableRoles.map((role) => ({ value: role.id, label: role.roleName })),
            ]}
            value={nextRoleId}
            onChange={(event) => setNextRoleId(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRoleDialogUser(null)}>Cancel</Button>
            <Button onClick={() => void confirmChangeRole()} disabled={!nextRoleId}>Update Role</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title="View Information"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setViewUser(null)}>Close</Button>
            <Button
              onClick={() => {
                if (!viewUser) {
                  return
                }

                navigate(`/admin/users/${viewUser.id}/edit`)
              }}
            >
              Edit User
            </Button>
          </div>
        }
      >
        {viewUser ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-5 py-4">
              <Avatar name={getUserDisplayName(viewUser)} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{getUserDisplayName(viewUser)}</p>
                <p className="text-sm text-slate-500">{viewUser.email}</p>
              </div>
              <RoleBadge role={viewUser.roleName || 'TeamMember'} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <UserInfoField label="Status" value={(viewUser.isActive ?? viewUser.status === 'active') ? 'Active' : 'Inactive'} />
              <UserInfoField label="Team" value={viewUser.teamName || 'No team assigned'} />
              <UserInfoField label="Organization" value={viewUser.organizationName || viewUser.organization || 'Company tenant'} />
              <UserInfoField label="Projects" value={String(viewUser.projectCount ?? 0)} />
              <UserInfoField label="Tasks" value={String(viewUser.taskCount ?? 0)} />
              <UserInfoField label="Last Login" value={formatUserDate(viewUser.lastLogin || viewUser.updatedAtUtc || viewUser.createdAtUtc)} />
              <UserInfoField label="Created" value={formatUserDate(viewUser.createdAtUtc)} />
              <UserInfoField label="Updated" value={formatUserDate(viewUser.updatedAtUtc)} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function getUserDisplayName(user: User) {
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
}

function formatUserDate(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Not available'
}

function UserInfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
