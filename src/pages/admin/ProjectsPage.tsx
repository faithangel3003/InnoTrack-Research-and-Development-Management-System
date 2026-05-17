import { FolderKanban, PencilLine, Plus, Search, TimerReset, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import * as userApi from '../../api/userApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { ProjectFormModal, type ProjectFormValues } from '../../components/admin/projects/ProjectFormModal'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { classNames } from '../../utils/classNames'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/formatDate'
import { countActiveProjects, getProjectProgress, getProjectTaskTotals, normalizeProjectStatus, projectPriorityClasses, projectStatusClasses } from '../../utils/projectMetrics'
import { normalizeRole } from '../../utils/roleHelpers'

type ProjectAssignment = {
  projectManagerUserId: string
  memberUserIds: string[]
}

const projectPageSize = 8

export function ProjectsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [users, setUsers] = useState<userApi.User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectPage, setProjectPage] = useState(1)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeProject, setActiveProject] = useState<projectApi.Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<projectApi.Project | null>(null)
  const [assignment, setAssignment] = useState<ProjectAssignment>({ projectManagerUserId: '', memberUserIds: [] })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canManageProjects = user?.role === 'SystemAdmin' || user?.role === 'ProjectManager'
  const canDeleteProjects = user?.role === 'SystemAdmin' || user?.role === 'ProjectManager' || user?.role === 'SuperAdmin'

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await projectApi.getAllProjects()
      setProjects(data)
      setError('')
    } catch (loadError) {
      setProjects([])
      setError(getErrorMessage(loadError, 'Failed to load projects'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const response = await userApi.getAllUsers({ page: 1, pageSize: 250, isActive: true })
      setUsers(response.data)
    } catch {
      setUsers([])
    }
  }, [])

  useEffect(() => {
    void loadProjects()
    void loadUsers()
  }, [loadProjects, loadUsers])

  const eligibleUsers = useMemo(() => {
    return users.filter((entry) => {
      const role = normalizeRole(entry.roleName)
      return (entry.isActive ?? entry.status === 'active') && role !== 'SystemAdmin' && role !== 'SuperAdmin'
    })
  }, [users])

  const projectManagerOptions = useMemo(() => {
    const projectManagers = eligibleUsers.filter((entry) => normalizeRole(entry.roleName) === 'ProjectManager')
    const scopedManagers = user?.role === 'ProjectManager'
      ? projectManagers.filter((entry) => entry.id === user.id)
      : projectManagers

    return scopedManagers.map((entry) => ({
      value: entry.id,
      label: entry.name || [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() || entry.email,
    }))
  }, [eligibleUsers, user?.id, user?.role])

  const memberOptions = useMemo(() => eligibleUsers.map((entry) => ({
    value: entry.id,
    label: entry.name || [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() || entry.email,
  })), [eligibleUsers])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const text = `${project.title} ${project.description || ''}`.toLowerCase()
      const searchMatch = !search || text.includes(search.toLowerCase())
      const statusMatch = !statusFilter || project.status === statusFilter
      return searchMatch && statusMatch
    })
  }, [projects, search, statusFilter])

  useEffect(() => {
    setProjectPage(1)
  }, [search, statusFilter])

  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize))

  useEffect(() => {
    if (projectPage > projectTotalPages) {
      setProjectPage(projectTotalPages)
    }
  }, [projectPage, projectTotalPages])

  const paginatedProjects = useMemo(
    () => filteredProjects.slice((projectPage - 1) * projectPageSize, projectPage * projectPageSize),
    [filteredProjects, projectPage],
  )

  const stats = useMemo(() => {
    const taskTotals = getProjectTaskTotals(filteredProjects)
    const averageProgress = filteredProjects.length
      ? Math.round(filteredProjects.reduce((sum, project) => sum + getProjectProgress(project), 0) / filteredProjects.length)
      : 0

    return {
      totalProjects: filteredProjects.length,
      activeProjects: countActiveProjects(filteredProjects),
      teamMembers: filteredProjects.reduce((sum, project) => sum + project.memberCount, 0),
      averageProgress,
      totalTasks: taskTotals.total,
    }
  }, [filteredProjects])

  const statusOptions = useMemo(() => {
    const values = Array.from(new Set(projects.map((project) => project.status))).filter(Boolean)
    return [{ value: '', label: 'All Statuses' }, ...values.map((value) => ({ value, label: normalizeProjectStatus(value) }))]
  }, [projects])

  const spotlightProjects = useMemo(
    () => [...filteredProjects].sort((left, right) => new Date(left.endDate).getTime() - new Date(right.endDate).getTime()).slice(0, 4),
    [filteredProjects],
  )

  const showActions = canManageProjects || canDeleteProjects

  function closeModal() {
    setModalMode(null)
    setActiveProject(null)
    setAssignment({ projectManagerUserId: '', memberUserIds: [] })
  }

  function openCreateModal() {
    setActiveProject(null)
    setAssignment({ projectManagerUserId: projectManagerOptions[0]?.value || '', memberUserIds: [] })
    setModalMode('create')
  }

  async function openEditModal(project: projectApi.Project) {
    setActiveProject(project)
    setModalMode('edit')
    try {
      const members = await projectApi.getProjectMembers(project.id)
      const lead = members.find((member) => member.memberRole === 'Lead')
      setAssignment({
        projectManagerUserId: lead?.userId || projectManagerOptions[0]?.value || '',
        memberUserIds: members.filter((member) => member.memberRole !== 'Lead').map((member) => member.userId),
      })
    } catch {
      setAssignment({ projectManagerUserId: projectManagerOptions[0]?.value || '', memberUserIds: [] })
    }
  }

  async function syncProjectMembers(projectId: string, values: ProjectFormValues) {
    const desired = new Map<string, projectApi.ProjectMemberRole>()
    if (values.projectManagerUserId) {
      desired.set(values.projectManagerUserId, 'Lead')
    }

    values.memberUserIds
      .filter((id) => id && id !== values.projectManagerUserId)
      .forEach((id) => desired.set(id, 'Contributor'))

    if (desired.size === 0) {
      return
    }

    const existing = await projectApi.getProjectMembers(projectId)
    const membersToRemove = existing.filter((member) => !desired.has(member.userId) || desired.get(member.userId) !== member.memberRole)

    await Promise.all(membersToRemove.map((member) => projectApi.removeProjectMember(projectId, member.userId)))

    const existingAfterRemoval = existing.filter((member) => !membersToRemove.some((removed) => removed.userId === member.userId))
    const existingUserIds = new Set(existingAfterRemoval.map((member) => member.userId))

    await Promise.all([...desired.entries()]
      .filter(([userId]) => !existingUserIds.has(userId))
      .map(([userId, memberRole]) => projectApi.addProjectMember(projectId, { userId, memberRole })))
  }

  async function handleSaveProject(values: ProjectFormValues) {
    if (!canManageProjects) {
      throw new Error('Only Organization Admins and Project Managers can manage project records')
    }

    if (!user?.organizationId) {
      throw new Error('Your account is missing an organization assignment')
    }

    setSaving(true)
    try {
      if (modalMode === 'edit' && activeProject) {
        await projectApi.updateProject(activeProject.id, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          priority: values.priority,
          startDate: values.startDate,
          endDate: values.endDate,
        })

        if (values.status !== activeProject.status) {
          await projectApi.changeProjectStatus(activeProject.id, {
            status: values.status,
            remarks: values.statusRemarks?.trim() || undefined,
          })
        }

        await syncProjectMembers(activeProject.id, values)

        toast.success('Project updated successfully')
      } else {
        const created = await projectApi.createProject({
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          priority: values.priority,
          startDate: values.startDate,
          endDate: values.endDate,
          organizationId: user.organizationId,
        })

        if (values.status !== 'Draft') {
          await projectApi.changeProjectStatus(created.id, {
            status: values.status,
            remarks: values.statusRemarks?.trim() || undefined,
          })
        }

        await syncProjectMembers(created.id, values)

        toast.success('Project created successfully')
      }

      closeModal()
      await loadProjects()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteProject() {
    if (!deletingProject) {
      return
    }

    setDeleting(true)
    try {
      await projectApi.deleteProject(deletingProject.id)
      toast.success('Project deleted successfully')
      setDeletingProject(null)
      await loadProjects()
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete project'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Projects" value={stats.totalProjects} helper="Visible projects in the current portfolio" icon={<FolderKanban size={18} />} tone="sky" />
        <AdminMetricCard label="Active Delivery" value={stats.activeProjects} helper="Projects currently in progress or review" icon={<TimerReset size={18} />} tone="amber" />
        <AdminMetricCard label="Team Allocation" value={stats.teamMembers} helper="Combined member assignments across projects" icon={<Users size={18} />} tone="emerald" />
        <AdminMetricCard label="Average Progress" value={`${stats.averageProgress}%`} helper={`${stats.totalTasks} total tasks tracked`} icon={<FolderKanban size={18} />} tone="slate" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Project Portfolio"
          subtitle="Track progress, priorities, timeline health, and maintain the full project record in one place."
          className="overflow-hidden"
          padding="sm"
          actions={
            <div className="flex flex-col items-stretch gap-3 lg:items-end">
              {canManageProjects ? (
                <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>
                  New Project
                </Button>
              ) : null}
              {canManageProjects && !projectManagerOptions.length ? (
                <p className="max-w-xs text-xs text-amber-600 lg:text-right">
                  No Project Manager user is available yet. You can still create the project now and assign the lead later.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Input className="w-full sm:w-72" placeholder="Search project title" leftIcon={<Search size={14} />} value={search} onChange={(event) => setSearch(event.target.value)} />
                <Select className="w-full sm:w-48" options={statusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState title="No projects found" message="Try changing the search or status filter." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Project</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Priority</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Timeline</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Progress</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
                      {showActions ? <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedProjects.map((project) => {
                      const progress = getProjectProgress(project)
                      return (
                        <tr key={project.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{project.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{project.description || 'No project description provided.'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', projectPriorityClasses(project.priority))}>
                              {project.priority}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            <p>{formatDate(project.startDate)}</p>
                            <p className="text-xs text-slate-400">to {formatDate(project.endDate)}</p>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-slate-900">{project.memberCount}</td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <div className="h-2 w-40 rounded-full bg-slate-100">
                                <div className="h-2 rounded-full bg-sky-700" style={{ width: `${progress}%` }} />
                              </div>
                              <p className="text-xs text-slate-500">{project.completedTasks}/{project.totalTasks} tasks completed</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', projectStatusClasses(project.status))}>
                              {normalizeProjectStatus(project.status)}
                            </span>
                          </td>
                          {showActions ? (
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {canManageProjects ? (
                                  <Button size="sm" variant="secondary" leftIcon={<PencilLine size={14} />} onClick={() => void openEditModal(project)}>
                                    Edit
                                  </Button>
                                ) : null}
                                {canDeleteProjects ? (
                                  <Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} onClick={() => setDeletingProject(project)}>
                                    Delete
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-1">
                <Pagination
                  currentPage={projectPage}
                  totalPages={projectTotalPages}
                  totalItems={filteredProjects.length}
                  pageSize={projectPageSize}
                  onPageChange={setProjectPage}
                />
              </div>
            </>
          )}
        </Card>

        <Card title="Upcoming Milestones" subtitle="Projects closest to their target delivery date.">
          <div className="space-y-4">
            {spotlightProjects.length ? spotlightProjects.map((project) => {
              const progress = getProjectProgress(project)

              return (
                <div key={project.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{project.title}</p>
                      <p className="mt-1 text-sm text-slate-500">Target delivery: {formatDate(project.endDate)}</p>
                    </div>
                    <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', projectStatusClasses(project.status))}>
                      {normalizeProjectStatus(project.status)}
                    </span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-700" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{project.completedTasks}/{project.totalTasks} tasks complete</span>
                    <span>{project.memberCount} members</span>
                  </div>
                </div>
              )
            }) : <EmptyState title="No milestones yet" message="Projects with scheduled end dates will appear here." />}
          </div>
        </Card>
      </div>

      <ProjectFormModal
        mode={modalMode === 'edit' ? 'edit' : 'create'}
        project={modalMode === 'edit' ? activeProject : null}
        projectManagerOptions={projectManagerOptions}
        memberOptions={memberOptions}
        assignedProjectManagerId={assignment.projectManagerUserId}
        assignedMemberIds={assignment.memberUserIds}
        isOpen={modalMode !== null}
        isSaving={saving}
        onClose={closeModal}
        onSubmit={handleSaveProject}
      />

      <ConfirmDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message={`Delete ${deletingProject?.title || 'this project'}? This will remove the project record and all related delivery history.`}
        confirmText="Delete Project"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}
