import { Building2, FolderTree, PencilLine, Plus, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import * as userApi from '../../api/userApi'
import type { Team } from '../../api/teamApi'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizations } from '../../hooks/useOrganizations'
import { useTeams } from '../../hooks/useTeams'
import { getErrorMessage } from '../../utils/apiError'
import { normalizeRole } from '../../utils/roleHelpers'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { ErrorBanner } from '../ui/ErrorBanner'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Pagination } from '../ui/Pagination'
import { RoleBadge } from './RoleBadge'
import { SearchBar } from '../ui/SearchBar'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

export function TeamManagementSection() {
  const { user } = useAuth()
  const { organizations, loading: organizationsLoading } = useOrganizations()
  const isSuperAdmin = normalizeRole(user?.role) === 'SuperAdmin'

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(isSuperAdmin ? '' : user?.organizationId ?? '')
  const activeOrganizationId = isSuperAdmin ? selectedOrganizationId : user?.organizationId ?? ''
  const [search, setSearch] = useState('')
  const [teamPage, setTeamPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [viewTeam, setViewTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [organizationUsers, setOrganizationUsers] = useState<userApi.User[]>([])
  const [organizationUsersLoading, setOrganizationUsersLoading] = useState(false)
  const [organizationUsersError, setOrganizationUsersError] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [memberSaveLoading, setMemberSaveLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null)
  const teamPageSize = 5

  const {
    teams,
    loading,
    saving,
    deletingId,
    error,
    clearError,
    refreshTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  } = useTeams(selectedOrganizationId || null)

  const showTeamWorkspace = !isSuperAdmin || Boolean(activeOrganizationId)

  const loadOrganizationUsers = useCallback(async () => {
    if (!showTeamWorkspace) {
      setOrganizationUsers([])
      setOrganizationUsersError('')
      setOrganizationUsersLoading(false)
      return
    }

    setOrganizationUsersLoading(true)
    try {
      const users = await userApi.getAccessibleUsers({ page: 1, pageSize: 500 })
      const scopedUsers = users
        .filter((entry) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(entry.roleName)))
        .filter((entry) => !activeOrganizationId || entry.organizationId === activeOrganizationId)

      setOrganizationUsers(scopedUsers)
      setOrganizationUsersError('')
    } catch (loadUsersError) {
      setOrganizationUsers([])
      setOrganizationUsersError(getErrorMessage(loadUsersError, 'Failed to load organization users.'))
    } finally {
      setOrganizationUsersLoading(false)
    }
  }, [activeOrganizationId, showTeamWorkspace])

  useEffect(() => {
    void loadOrganizationUsers()
  }, [loadOrganizationUsers])

  useEffect(() => {
    if (!isFormOpen) {
      setSelectedMemberIds([])
      setMemberSearch('')
      setFormError('')
      return
    }

    setTeamName(editingTeam?.name ?? '')
    setTeamDescription(editingTeam?.description ?? '')
    setSelectedMemberIds(editingTeam ? organizationUsers.filter((entry) => entry.teamId === editingTeam.id).map((entry) => entry.id) : [])
    setMemberSearch('')
    setFormError('')
  }, [editingTeam, isFormOpen, organizationUsers])

  useEffect(() => {
    setTeamPage(1)
  }, [search, activeOrganizationId])

  const companyOptions = useMemo(
    () => [{ value: '', label: 'Select company' }, ...organizations.map((organization) => ({ value: organization.id, label: organization.name }))],
    [organizations],
  )

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return teams
    }

    return teams.filter((team) => `${team.name} ${team.description ?? ''}`.toLowerCase().includes(query))
  }, [search, teams])

  const totalTeamPages = useMemo(() => Math.max(1, Math.ceil(filteredTeams.length / teamPageSize)), [filteredTeams.length])

  const paginatedTeams = useMemo(() => {
    const startIndex = (teamPage - 1) * teamPageSize
    return filteredTeams.slice(startIndex, startIndex + teamPageSize)
  }, [filteredTeams, teamPage])

  useEffect(() => {
    if (teamPage > totalTeamPages) {
      setTeamPage(totalTeamPages)
    }
  }, [teamPage, totalTeamPages])

  const memberCandidates = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()

    return [...organizationUsers]
      .filter((entry) => {
        if (!query) {
          return true
        }

        const searchable = `${getUserDisplayName(entry)} ${entry.email} ${entry.teamName ?? ''}`.toLowerCase()
        return searchable.includes(query)
      })
      .sort((left, right) => {
        const leftSelected = selectedMemberIds.includes(left.id) ? 1 : 0
        const rightSelected = selectedMemberIds.includes(right.id) ? 1 : 0
        if (leftSelected !== rightSelected) {
          return rightSelected - leftSelected
        }

        return getUserDisplayName(left).localeCompare(getUserDisplayName(right))
      })
  }, [memberSearch, organizationUsers, selectedMemberIds])

  const viewTeamMembers = useMemo(() => {
    if (!viewTeam) {
      return []
    }

    return organizationUsers.filter((entry) => entry.teamId === viewTeam.id)
  }, [organizationUsers, viewTeam])

  function openCreateTeam() {
    setFormMode('create')
    setEditingTeam(null)
    setIsFormOpen(true)
  }

  function openEditTeam(team: Team) {
    setFormMode('edit')
    setEditingTeam(team)
    setViewTeam(null)
    setIsFormOpen(true)
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) => current.includes(userId)
      ? current.filter((entry) => entry !== userId)
      : [...current, userId])
  }

  async function handleSaveTeam() {
    if (!teamName.trim()) {
      setFormError('Team name is required')
      return
    }

    try {
      setFormError('')

      if (formMode === 'create') {
        await createTeam({
          name: teamName.trim(),
          description: teamDescription.trim(),
        })
        toast.success('Team created successfully')
      } else if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: teamName.trim(),
          description: teamDescription.trim(),
        })

        const currentMemberIds = new Set(organizationUsers.filter((entry) => entry.teamId === editingTeam.id).map((entry) => entry.id))
        const nextMemberIds = new Set(selectedMemberIds)
        const changedUsers = organizationUsers.filter((entry) => currentMemberIds.has(entry.id) !== nextMemberIds.has(entry.id))

        if (changedUsers.length > 0) {
          setMemberSaveLoading(true)
          try {
            for (const member of changedUsers) {
              await userApi.updateUser(member.id, buildTeamAssignmentPayload(member, nextMemberIds.has(member.id) ? editingTeam.id : null, activeOrganizationId || null))
            }
          } finally {
            setMemberSaveLoading(false)
          }
        }

        await Promise.all([refreshTeams(), loadOrganizationUsers()])
        toast.success('Team updated successfully')
      }

      setIsFormOpen(false)
      setEditingTeam(null)
    } catch (error) {
      setFormError(getErrorMessage(error, `Failed to ${formMode === 'create' ? 'create' : 'update'} team`))
    }
  }

  async function handleDeleteTeam() {
    if (!pendingDelete) {
      return
    }

    try {
      await deleteTeam(pendingDelete.id)
      toast.success('Team deleted successfully')
      if (viewTeam?.id === pendingDelete.id) {
        setViewTeam(null)
      }
      setPendingDelete(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete team'))
    }
  }

  return (
    <>
      <Card
        title="Team Management"
        subtitle="Create tenant-specific teams for each company without touching the platform organization registry."
        actions={
          <Button type="button" onClick={openCreateTeam} leftIcon={<Plus className="h-4 w-4" />} disabled={isSuperAdmin && !selectedOrganizationId}>
            Create Team
          </Button>
        }
      >
        <div className="space-y-4">
          <ErrorBanner message={error} onDismiss={clearError} />

          {isSuperAdmin ? (
            <Select
              label="Company"
              requiredField
              options={companyOptions}
              value={selectedOrganizationId}
              onChange={(event) => {
                setSelectedOrganizationId(event.target.value)
                setTeamPage(1)
                setPendingDelete(null)
                setEditingTeam(null)
                setViewTeam(null)
                setIsFormOpen(false)
              }}
              disabled={organizationsLoading}
              hint="Choose which company tenant owns the teams you want to manage."
            />
          ) : null}

          {!showTeamWorkspace ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500">
              Select a company first to load and manage its teams.
            </div>
          ) : (
            <>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                <SearchBar placeholder="Search teams..." onSearch={setSearch} />
                <div className="flex items-center text-sm text-slate-500">
                  Deleting a team only removes the grouping. Users stay in the same company tenant and become unassigned.
                </div>
              </div>

              <ErrorBanner message={organizationUsersError} onDismiss={() => setOrganizationUsersError('')} />

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : filteredTeams.length === 0 ? (
                <EmptyState
                  icon={<FolderTree className="h-12 w-12 text-slate-300" />}
                  title="No teams found"
                  message={teams.length === 0 ? 'Create the first tenant team and start assigning users into it.' : 'Try another search term.'}
                />
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team</th>
                          <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Description</th>
                          <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Members</th>
                          <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Updated</th>
                          <th className="px-4 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedTeams.map((team) => (
                          <tr
                            key={team.id}
                            className="cursor-pointer transition hover:bg-slate-50/80"
                            onClick={() => setViewTeam(team)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setViewTeam(team)
                              }
                            }}
                            tabIndex={0}
                            role="button"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{team.name}</p>
                                  <p className="text-xs text-slate-400">{new Date(team.createdAtUtc).toLocaleDateString('en-US')}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600">{team.description || 'No description provided'}</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                <Users className="h-4 w-4" />
                                {team.memberCount}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-500">{new Date(team.updatedAtUtc).toLocaleDateString('en-US')}</td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openEditTeam(team)
                                  }}
                                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                  title="Edit team"
                                >
                                  <PencilLine size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setPendingDelete(team)
                                  }}
                                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
                                  title="Delete team"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={teamPage}
                    totalPages={totalTeamPages}
                    totalItems={filteredTeams.length}
                    pageSize={teamPageSize}
                    onPageChange={setTeamPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={saving || memberSaveLoading ? () => undefined : () => setIsFormOpen(false)}
        title={formMode === 'create' ? 'Create Team' : 'Edit Team'}
        size={formMode === 'edit' ? 'lg' : 'md'}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)} disabled={saving || memberSaveLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSaveTeam()} loading={saving || memberSaveLoading}>
              {formMode === 'create' ? 'Create Team' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Team Name"
            requiredField
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            error={formError && !teamName.trim() ? formError : undefined}
            placeholder="e.g. Product Research"
          />
          <Textarea
            label="Description"
            value={teamDescription}
            onChange={(event) => setTeamDescription(event.target.value)}
            placeholder="Optional notes about the team scope, focus, or responsibilities"
          />

          {formMode === 'edit' ? (
            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Team Members</p>
                  <p className="text-xs text-slate-500">Add, remove, or reassign users for this team within your organization.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  {selectedMemberIds.length} selected
                </span>
              </div>

              <Input
                label="Search users"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by name, email, or current team"
              />

              {organizationUsersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl bg-white" />
                  ))}
                </div>
              ) : memberCandidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No users match this search.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {memberCandidates.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id)
                    const currentTeamLabel = member.teamId === editingTeam?.id
                      ? 'Currently on this team'
                      : member.teamName
                        ? `Currently on ${member.teamName}`
                        : 'Not assigned to a team'

                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-200 hover:bg-sky-50/40"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(member.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <Avatar name={getUserDisplayName(member)} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{getUserDisplayName(member)}</p>
                            <RoleBadge role={member.roleName || 'TeamMember'} appearance="text" />
                          </div>
                          <p className="text-xs text-slate-500">{member.email}</p>
                          <p className="mt-1 text-xs text-slate-400">{currentTeamLabel}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
              Members can be assigned after the team is created.
            </div>
          )}

          {formError && teamName.trim() ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={!!viewTeam}
        onClose={() => setViewTeam(null)}
        title="View Information"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setViewTeam(null)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!viewTeam) {
                  return
                }

                openEditTeam(viewTeam)
              }}
            >
              Edit Team
            </Button>
          </div>
        }
      >
        {viewTeam ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-5 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{viewTeam.name}</p>
                <p className="text-sm text-slate-500">{viewTeam.description || 'No description provided'}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
                <Users className="h-4 w-4" />
                {viewTeam.memberCount} members
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TeamInfoField label="Description" value={viewTeam.description || 'No description provided'} />
              <TeamInfoField label="Members" value={String(viewTeam.memberCount)} />
              <TeamInfoField label="Created" value={formatTeamDate(viewTeam.createdAtUtc)} />
              <TeamInfoField label="Updated" value={formatTeamDate(viewTeam.updatedAtUtc)} />
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Assigned Users</p>
                  <p className="text-xs text-slate-500">Organization users currently mapped to this team.</p>
                </div>
              </div>

              {organizationUsersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : viewTeamMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">
                  No users are currently assigned to this team.
                </div>
              ) : (
                <div className="space-y-2">
                  {viewTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <Avatar name={getUserDisplayName(member)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{getUserDisplayName(member)}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <RoleBadge role={member.roleName || 'TeamMember'} appearance="text" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteTeam}
        title="Delete Team"
        message={`Delete ${pendingDelete?.name || 'this team'}? Users currently assigned to it will remain in the same company but lose their team assignment.`}
        confirmText="Yes, Delete"
        confirmVariant="danger"
        loading={pendingDelete ? deletingId === pendingDelete.id : false}
      />
    </>
  )
}

function getUserDisplayName(user: userApi.User) {
  return user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
}

function buildTeamAssignmentPayload(user: userApi.User, teamId: string | null, fallbackOrganizationId: string | null): userApi.UpdateUserPayload {
  const normalizedFullName = (user.name || '').trim().split(/\s+/).filter(Boolean)
  const roleId = user.roleId

  if (!roleId) {
    throw new Error(`Role data is missing for ${getUserDisplayName(user)}.`)
  }

  return {
    firstName: user.firstName?.trim() || normalizedFullName[0] || 'User',
    lastName: user.lastName?.trim() || normalizedFullName.slice(1).join(' ') || 'Member',
    email: user.email,
    roleId,
    organizationId: user.organizationId ?? fallbackOrganizationId,
    teamId,
    isActive: user.isActive ?? user.status === 'active',
  }
}

function formatTeamDate(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Not available'
}

function TeamInfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}