import { CheckCircle2, Clock3, Search, TimerReset } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as projectApi from '../../api/projectApi'
import * as taskApi from '../../api/taskApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { classNames } from '../../utils/classNames'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/formatDate'
import { projectPriorityClasses } from '../../utils/projectMetrics'

const TEAM_MEMBER_TASKS_UPDATED_EVENT = 'innotrack:team-member-tasks-updated'

type TaskRow = taskApi.ProjectTask & {
  projectTitle: string
}

const statusOptions: Array<{ value: taskApi.TaskStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'Todo', label: 'To Do' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Done', label: 'Done' },
  { value: 'Blocked', label: 'Blocked' },
]

function taskStatusClasses(status: taskApi.TaskStatus | string) {
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

function formatTaskStatus(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function MyTasksPage() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [tasks, setTasks] = useState<taskApi.ProjectTask[]>([])
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [updatingTaskId, setUpdatingTaskId] = useState('')
  const [referenceNow, setReferenceNow] = useState(() => Date.now())
  const focusedTaskId = searchParams.get('taskId') || ''

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const [taskData, projectData] = await Promise.all([
        taskApi.getMyTasks(),
        projectApi.getAllProjects().catch(() => []),
      ])

      setTasks(taskData)
      setProjects(projectData)
      setError('')
    } catch (loadError) {
      setTasks([])
      setProjects([])
      setError(getErrorMessage(loadError, 'Failed to load your tasks'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    setReferenceNow(Date.now())
  }, [tasks])

  useEffect(() => {
    if (!focusedTaskId) {
      return
    }

    setSearch('')
    setStatusFilter('')
  }, [focusedTaskId])

  const projectNamesById = useMemo(() => new Map(projects.map((project) => [project.id, project.title])), [projects])

  const taskRows = useMemo<TaskRow[]>(() => tasks.map((task) => ({
    ...task,
    projectTitle: projectNamesById.get(task.projectId) || 'Assigned project',
  })), [projectNamesById, tasks])

  const filteredTasks = useMemo(() => {
    return taskRows.filter((task) => {
      const text = `${task.title} ${task.description || ''} ${task.projectTitle}`.toLowerCase()
      const searchMatch = !search || text.includes(search.toLowerCase())
      const statusMatch = !statusFilter || task.status === statusFilter
      return searchMatch && statusMatch
    })
  }, [search, statusFilter, taskRows])

  const stats = useMemo(() => {
    const completed = filteredTasks.filter((task) => task.status === 'Done').length
    const overdue = filteredTasks.filter((task) => task.status !== 'Done' && new Date(task.dueDate).getTime() < referenceNow).length
    const inProgress = filteredTasks.filter((task) => task.status === 'InProgress').length

    return {
      total: filteredTasks.length,
      completed,
      inProgress,
      overdue,
    }
  }, [filteredTasks, referenceNow])

  const groupedTasks = useMemo(() => {
    return statusOptions
      .filter((option): option is { value: taskApi.TaskStatus; label: string } => Boolean(option.value))
      .map((option) => ({
        ...option,
        tasks: filteredTasks.filter((task) => task.status === option.value),
      }))
      .filter((group) => group.tasks.length > 0 || !statusFilter)
  }, [filteredTasks, statusFilter])

  useEffect(() => {
    if (!focusedTaskId || loading || !taskRows.some((task) => task.id === focusedTaskId)) {
      return
    }

    document.getElementById(`team-task-${focusedTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedTaskId, loading, taskRows])

  async function handleStatusChange(task: TaskRow, status: taskApi.TaskStatus) {
    if (task.status === status) {
      return
    }

    setUpdatingTaskId(task.id)
    try {
      await taskApi.updateTaskStatus(task.id, { status })
      toast.success('Task status updated')
      window.dispatchEvent(new CustomEvent(TEAM_MEMBER_TASKS_UPDATED_EVENT))
      await loadTasks()
    } catch (statusError) {
      toast.error(getErrorMessage(statusError, 'Failed to update task status'))
    } finally {
      setUpdatingTaskId('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Assigned Tasks" value={stats.total} helper="Tasks currently assigned to you" icon={<CheckCircle2 size={18} />} tone="sky" />
        <AdminMetricCard label="In Progress" value={stats.inProgress} helper="Tasks actively moving" icon={<TimerReset size={18} />} tone="amber" />
        <AdminMetricCard label="Completed" value={stats.completed} helper="Tasks marked done" icon={<CheckCircle2 size={18} />} tone="emerald" />
        <AdminMetricCard label="Overdue" value={stats.overdue} helper="Tasks past due date" icon={<Clock3 size={18} />} tone="rose" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card
        title="My Tasks"
        subtitle="Update assigned work without leaving your team workspace."
        padding="sm"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Input className="w-full sm:w-72" placeholder="Search task or project" leftIcon={<Search size={14} />} value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select className="w-full sm:w-48" options={statusOptions} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} />
          </div>
        }
      >
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState title="No assigned tasks" message="Assigned project work will appear here when your project manager creates tasks for you." />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {groupedTasks.map((group) => (
              <section key={group.value} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{group.label}</h2>
                    <p className="mt-1 text-xs text-slate-500">{group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}</p>
                  </div>
                  <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', taskStatusClasses(group.value))}>
                    {group.label}
                  </span>
                </div>

                {group.tasks.length ? (
                  <div className="space-y-3">
                    {group.tasks.map((task) => (
                      <article
                        id={`team-task-${task.id}`}
                        key={task.id}
                        className={classNames(
                          'rounded-2xl border p-4',
                          focusedTaskId === task.id
                            ? 'border-sky-300 bg-sky-50 shadow-[0_10px_24px_rgba(14,116,144,0.12)]'
                            : 'border-slate-100 bg-slate-50/70',
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900">{task.title}</h3>
                            <p className="mt-1 text-sm text-slate-500">{task.projectTitle}</p>
                            {focusedTaskId === task.id ? (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Opened from alerts</p>
                            ) : null}
                          </div>
                          <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', taskStatusClasses(task.status))}>
                            {formatTaskStatus(task.status)}
                          </span>
                        </div>

                        {task.description ? <p className="mt-3 text-sm text-slate-600">{task.description}</p> : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm text-slate-500">
                            <span>Due {formatDate(task.dueDate)}</span>
                            <span className={classNames('ml-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', projectPriorityClasses(task.priority))}>{task.priority}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              className="w-40"
                              value={task.status}
                              options={statusOptions.filter((option) => option.value)}
                              disabled={updatingTaskId === task.id}
                              onChange={(event) => void handleStatusChange(task, event.target.value as taskApi.TaskStatus)}
                            />
                            <Button variant="secondary" size="sm" onClick={() => void handleStatusChange(task, 'Done')} disabled={task.status === 'Done' || updatingTaskId === task.id}>
                              Mark Done
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={`No ${group.label.toLowerCase()} tasks`} message="Tasks will move here when their status changes." />
                )}
              </section>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
