  import { CheckSquare, Clock3, PencilLine, Plus, Search, TimerReset, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import * as taskApi from '../../api/taskApi'
import * as userApi from '../../api/userApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { TaskFormModal, type TaskFormValues } from '../../components/admin/tasks/TaskFormModal'
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
import { truncateWords } from '../../utils/text'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/formatDate'
import { projectPriorityClasses } from '../../utils/projectMetrics'
import { normalizeRole } from '../../utils/roleHelpers'

type TaskRow = taskApi.ProjectTask & {
  projectTitle: string
  assigneeName: string
}

const taskPageSize = 8

function taskStatusClasses(status: taskApi.TaskStatus) {
  switch (status) {
    case 'Done':
      return 'bg-emerald-50 text-emerald-700'
    case 'InProgress':
      return 'bg-sky-50 text-sky-700'
    case 'Blocked':
      return 'bg-rose-50 text-rose-700'
    case 'UnderReview':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function formatTaskStatus(status: taskApi.TaskStatus | string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function TasksPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [tasks, setTasks] = useState<taskApi.ProjectTask[]>([])
  const [users, setUsers] = useState<userApi.User[]>([])
  const [projectMemberUserIds, setProjectMemberUserIds] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [taskPage, setTaskPage] = useState(1)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeTask, setActiveTask] = useState<taskApi.ProjectTask | null>(null)
  const [deletingTask, setDeletingTask] = useState<TaskRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState('')
  const [referenceNow, setReferenceNow] = useState(() => Date.now())

  const canManageTasks = user?.role === 'SystemAdmin' || user?.role === 'ProjectManager'
  const canUpdateStatus = user?.role === 'SystemAdmin' || user?.role === 'ProjectManager' || user?.role === 'TeamMember'

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    try {
      const [projectList, userResponse] = await Promise.all([
        projectApi.getAllProjects(),
        userApi.getAllUsers({ page: 1, pageSize: 250, isActive: true }),
      ])

      const memberGroups = projectList.length
        ? await Promise.all(
            projectList.map(async (project) => {
              const members = await projectApi.getProjectMembers(project.id)
              return [project.id, members.map((member) => member.userId)] as const
            }),
          )
        : []

      const taskGroups = projectList.length
        ? await Promise.all(projectList.map(async (project) => taskApi.getProjectTasks(project.id)))
        : []

      const membersByProject = Object.fromEntries(memberGroups) as Record<string, string[]>

      setProjects(projectList)
      setUsers(userResponse.data)
      setProjectMemberUserIds(membersByProject)
      setTasks(taskGroups.flat())
      setError('')
    } catch (loadError) {
      setProjects([])
      setUsers([])
      setProjectMemberUserIds({})
      setTasks([])
      setError(getErrorMessage(loadError, 'Failed to load task workspace'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    setReferenceNow(Date.now())
  }, [tasks])

  const usersById = useMemo(() => new Map(users.map((entry) => [entry.id, entry])), [users])
  const projectsById = useMemo(() => new Map(projects.map((entry) => [entry.id, entry])), [projects])

  const taskRows = useMemo<TaskRow[]>(() => {
    return tasks.map((task) => {
      const assignee = usersById.get(task.assignedToUserId)
      const name = assignee?.name || [assignee?.firstName, assignee?.lastName].filter(Boolean).join(' ').trim() || assignee?.email || 'Unassigned'

      return {
        ...task,
        projectTitle: projectsById.get(task.projectId)?.title || 'Unknown project',
        assigneeName: name,
      }
    })
  }, [projectsById, tasks, usersById])

  const filteredBoard = useMemo(() => {
    return taskRows.filter((item) => {
      const text = `${item.title} ${item.description || ''} ${item.projectTitle} ${item.assigneeName}`.toLowerCase()
      const searchMatch = !search || text.includes(search.toLowerCase())
      const statusMatch = !statusFilter || item.status === statusFilter
      const projectMatch = !projectFilter || item.projectId === projectFilter
      return searchMatch && statusMatch && projectMatch
    })
  }, [projectFilter, search, statusFilter, taskRows])

  useEffect(() => {
    setTaskPage(1)
  }, [projectFilter, search, statusFilter])

  const taskTotalPages = Math.max(1, Math.ceil(filteredBoard.length / taskPageSize))

  useEffect(() => {
    if (taskPage > taskTotalPages) {
      setTaskPage(taskTotalPages)
    }
  }, [taskPage, taskTotalPages])

  const paginatedTasks = useMemo(
    () => filteredBoard.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize),
    [filteredBoard, taskPage],
  )

  const stats = useMemo(() => {
    return {
      totalTasks: filteredBoard.length,
      completedTasks: filteredBoard.filter((item) => item.status === 'Done').length,
      workstreams: new Set(filteredBoard.map((item) => item.projectId)).size,
      overdueTasks: filteredBoard.filter((item) => item.status !== 'Done' && new Date(item.dueDate).getTime() < referenceNow).length,
    }
  }, [filteredBoard, referenceNow])

  const deadlineItems = useMemo(
    () => [...filteredBoard].sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()).slice(0, 5),
    [filteredBoard],
  )

  const projectOptions = useMemo(
    () => [{ value: '', label: 'All Projects' }, ...projects.map((project) => ({ value: project.id, label: project.title }))],
    [projects],
  )

  const taskProjectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.title })),
    [projects],
  )

  const assigneeOptions = useMemo(() => {
    return users.filter((entry) => {
      const role = normalizeRole(entry.roleName)
      return (entry.isActive ?? entry.status === 'active') && role !== 'SystemAdmin' && role !== 'SuperAdmin'
    }).map((entry) => ({
      value: entry.id,
      label: entry.name || [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() || entry.email,
    }))
  }, [users])

  function closeModal() {
    setModalMode(null)
    setActiveTask(null)
  }

  async function ensureAssigneeProjectMembership(projectId: string, assigneeUserId: string) {
    const knownMembers = projectMemberUserIds[projectId] || []
    if (knownMembers.includes(assigneeUserId)) {
      return false
    }

    try {
      await projectApi.addProjectMember(projectId, {
        userId: assigneeUserId,
        memberRole: 'Contributor',
      })
    } catch (membershipError) {
      const membershipMessage = getErrorMessage(membershipError, 'Failed to add assignee to project members')
      const duplicateMembership = membershipMessage.toLowerCase().includes('already') && membershipMessage.toLowerCase().includes('member')
      if (!duplicateMembership) {
        throw membershipError
      }
    }

    setProjectMemberUserIds((current) => {
      const currentMembers = current[projectId] || []
      if (currentMembers.includes(assigneeUserId)) {
        return current
      }

      return {
        ...current,
        [projectId]: [...currentMembers, assigneeUserId],
      }
    })

    return true
  }

  async function handleSaveTask(values: TaskFormValues) {
    if (!canManageTasks) {
      throw new Error('Only Organization Admins and Project Managers can manage task records')
    }

    setSaving(true)
    try {
      if (modalMode === 'edit' && activeTask) {
        const addedAsMember = await ensureAssigneeProjectMembership(activeTask.projectId, values.assignedToUserId)

        await taskApi.updateTask(activeTask.id, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          assignedToUserId: values.assignedToUserId,
          priority: values.priority,
          dueDate: values.dueDate,
        })

        if (values.status !== activeTask.status) {
          await taskApi.updateTaskStatus(activeTask.id, { status: values.status })
        }

        if (addedAsMember) {
          toast.success('Assignee was added to the project members automatically')
        }

        toast.success('Task updated successfully')
      } else {
        const addedAsMember = await ensureAssigneeProjectMembership(values.projectId, values.assignedToUserId)

        const created = await taskApi.createProjectTask(values.projectId, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          assignedToUserId: values.assignedToUserId,
          priority: values.priority,
          dueDate: values.dueDate,
        })

        if (values.status !== 'Todo') {
          await taskApi.updateTaskStatus(created.id, { status: values.status })
        }

        if (addedAsMember) {
          toast.success('Assignee was added to the project members automatically')
        }

        toast.success('Task created successfully')
      }

      closeModal()
      await loadWorkspace()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask) {
      return
    }

    setDeleting(true)
    try {
      await taskApi.deleteTask(deletingTask.id)
      toast.success('Task deleted successfully')
      setDeletingTask(null)
      await loadWorkspace()
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete task'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleStatusChange(task: TaskRow, nextStatus: string) {
    const resolvedStatus = nextStatus as taskApi.TaskStatus
    if (!canUpdateStatus || task.status === resolvedStatus) {
      return
    }

    setStatusUpdatingId(task.id)
    try {
      await taskApi.updateTaskStatus(task.id, { status: resolvedStatus })
      toast.success('Task status updated successfully')
      await loadWorkspace()
    } catch (statusError) {
      toast.error(getErrorMessage(statusError, 'Failed to update task status'))
    } finally {
      setStatusUpdatingId('')
    }
  }

  const showActions = canManageTasks || canUpdateStatus

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Tracked Tasks" value={stats.totalTasks} helper="Live tasks currently visible in the board" icon={<CheckSquare size={18} />} tone="sky" />
        <AdminMetricCard label="Completed Tasks" value={stats.completedTasks} helper="Execution items already marked done" icon={<TimerReset size={18} />} tone="emerald" />
        <AdminMetricCard label="Active Workstreams" value={stats.workstreams} helper="Projects represented in the current task view" icon={<Clock3 size={18} />} tone="amber" />
        <AdminMetricCard label="Overdue Work" value={stats.overdueTasks} helper="Tasks whose due date has already passed" icon={<Clock3 size={18} />} tone="rose" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card
          title="Task Board"
          subtitle="Create, update, delete, and track delivery work across all active project spaces."
          className="overflow-hidden"
          padding="sm"
          actions={
            <div className="flex flex-col items-stretch gap-3 lg:items-end">
              {canManageTasks ? (
                <Button leftIcon={<Plus size={16} />} onClick={() => setModalMode('create')} disabled={!taskProjectOptions.length || !assigneeOptions.length}>
                  New Task
                </Button>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Input className="w-full sm:w-72" placeholder="Search task, project, or assignee" leftIcon={<Search size={14} />} value={search} onChange={(event) => setSearch(event.target.value)} />
                <Select className="w-full sm:w-52" options={projectOptions} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} />
                <Select
                  className="w-full sm:w-48"
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Todo', label: 'To Do' },
                    { value: 'InProgress', label: 'In Progress' },
                    { value: 'UnderReview', label: 'Under Review' },
                    { value: 'Done', label: 'Done' },
                    { value: 'Blocked', label: 'Blocked' },
                  ]}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                />
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
          ) : filteredBoard.length === 0 ? (
            <EmptyState title="No workstreams found" message="Try a different search or status filter." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Task</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Project</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assignee</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Due Date</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Priority</th>
                      <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
                      {showActions ? <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedTasks.map((item) => {
                      return (
                        <tr key={item.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{truncateWords(item.description) || 'No delivery notes were added for this task.'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700">{item.projectTitle}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{item.assigneeName}</td>
                          <td className="px-4 py-4 text-sm text-slate-700">{formatDate(item.dueDate)}</td>
                          <td className="px-4 py-4">
                            <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', projectPriorityClasses(item.priority))}>
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', taskStatusClasses(item.status as taskApi.TaskStatus))}>
                              {formatTaskStatus(item.status)}
                            </span>
                          </td>
                          {showActions ? (
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {canUpdateStatus ? (
                                  <select
                                    value={item.status}
                                    onChange={(event) => void handleStatusChange(item, event.target.value)}
                                    disabled={statusUpdatingId === item.id}
                                    className="min-w-[9rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                                  >
                                    <option value="Todo">To Do</option>
                                    <option value="InProgress">In Progress</option>
                                    <option value="UnderReview">Under Review</option>
                                    <option value="Done">Done</option>
                                    <option value="Blocked">Blocked</option>
                                  </select>
                                ) : null}
                                {canManageTasks ? (
                                  <Button size="sm" variant="secondary" leftIcon={<PencilLine size={14} />} onClick={() => {
                                    setActiveTask(item)
                                    setModalMode('edit')
                                  }}>
                                    Edit
                                  </Button>
                                ) : null}
                                {canManageTasks ? (
                                  <Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} onClick={() => setDeletingTask(item)}>
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
                  currentPage={taskPage}
                  totalPages={taskTotalPages}
                  totalItems={filteredBoard.length}
                  pageSize={taskPageSize}
                  onPageChange={setTaskPage}
                />
              </div>
            </>
          )}
        </Card>

        <Card title="Deadline Tracker" subtitle="Tasks nearest to their due date or already at risk.">
          <div className="space-y-4">
            {deadlineItems.length ? deadlineItems.map((item) => {
              return (
                <div key={item.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.projectTitle} · Due {formatDate(item.dueDate)}</p>
                    </div>
                    <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', taskStatusClasses(item.status as taskApi.TaskStatus))}>
                      {formatTaskStatus(item.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{item.assigneeName}</span>
                    <span>{item.priority} priority</span>
                  </div>
                </div>
              )
            }) : <EmptyState title="No deadlines found" message="Upcoming project due dates will appear here." />}
          </div>
        </Card>
      </div>

      <TaskFormModal
        mode={modalMode === 'edit' ? 'edit' : 'create'}
        task={modalMode === 'edit' ? activeTask : null}
        projectTitle={activeTask ? projectsById.get(activeTask.projectId)?.title : undefined}
        projects={taskProjectOptions}
        allUsers={assigneeOptions}
        projectMemberUserIds={projectMemberUserIds}
        isOpen={modalMode !== null}
        isSaving={saving}
        onClose={closeModal}
        onSubmit={handleSaveTask}
      />

      <ConfirmDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Delete ${deletingTask?.title || 'this task'}? This removes it from the project workflow immediately.`}
        confirmText="Delete Task"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  )
}