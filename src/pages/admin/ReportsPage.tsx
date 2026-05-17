import { BarChart3, CheckSquare, Download, Filter, FolderKanban, Printer, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import * as taskApi from '../../api/taskApi'
import * as userApi from '../../api/userApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { RadialSummaryChart } from '../../components/admin/RadialSummaryChart'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../context/ToastContext'
import { printReportElement } from '../../utils/printReport'
import { countActiveProjects, getProjectProgress, isProjectOverdue, normalizeProjectStatus } from '../../utils/projectMetrics'
import { normalizeRole, roleLabel } from '../../utils/roleHelpers'

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function defaultStartDate() {
  const value = new Date()
  value.setDate(value.getDate() - 30)
  return value.toISOString().slice(0, 10)
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10)
}

function inDateRange(value: string | Date | undefined, startDate: string, endDate: string) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    return true
  }

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null

  if (start && date < start) return false
  if (end && date > end) return false
  return true
}

function buildProjectSegmentLabel(project: projectApi.Project) {
  if (isProjectOverdue(project)) return 'Delayed'

  const normalized = normalizeProjectStatus(project.status)
  if (normalized === 'Completed') return 'Completed'
  if (normalized === 'On Hold' || normalized === 'In Review') return 'Review'
  if (normalized === 'In Progress') return 'In Progress'
  return 'Planning'
}

function buildTaskSegmentLabel(status: string) {
  const value = status.replace(/\s+/g, '').toLowerCase()
  if (value === 'done' || value === 'completed') return 'Completed'
  if (value === 'underreview' || value === 'review') return 'In Review'
  if (value === 'inprogress' || value === 'active') return 'In Progress'
  return 'To Do'
}

export function ReportsPage() {
  const toast = useToast()
  const reportContentRef = useRef<HTMLDivElement | null>(null)
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [tasks, setTasks] = useState<taskApi.ProjectTask[]>([])
  const [users, setUsers] = useState<userApi.User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draftStartDate, setDraftStartDate] = useState(defaultStartDate)
  const [draftEndDate, setDraftEndDate] = useState(defaultEndDate)
  const [filterStartDate, setFilterStartDate] = useState(defaultStartDate)
  const [filterEndDate, setFilterEndDate] = useState(defaultEndDate)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      try {
        const [projectData, userData] = await Promise.all([
          projectApi.getAllProjects(),
          userApi.getAllUsers({ page: 1, pageSize: 100, search: '', roleId: '', isActive: '' }),
        ])

        const taskLists = await Promise.all(projectData.map(async (project) => {
          try {
            return await taskApi.getProjectTasks(project.id)
          } catch {
            return []
          }
        }))

        if (!active) {
          return
        }

        setProjects(projectData)
        setTasks(taskLists.flat())
        setUsers(userData.data)
        setError('')
      } catch (loadError) {
        if (!active) {
          return
        }

        setProjects([])
        setTasks([])
        setUsers([])
        setError(loadError instanceof Error ? loadError.message : 'Failed to load report data')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const reportUsers = useMemo(
    () => users.filter((entry) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(entry.roleName))),
    [users],
  )

  const filteredProjects = useMemo(
    () => projects.filter((project) => inDateRange(project.startDate || project.createdAt, filterStartDate, filterEndDate)),
    [filterEndDate, filterStartDate, projects],
  )

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map((project) => project.id)), [filteredProjects])

  const filteredTasks = useMemo(
    () => tasks.filter((task) => filteredProjectIds.has(task.projectId) && inDateRange(task.createdAt, filterStartDate, filterEndDate)),
    [filterEndDate, filterStartDate, filteredProjectIds, tasks],
  )

  const activeUsers = useMemo(
    () => reportUsers.filter((entry) => entry.isActive ?? entry.status === 'active').length,
    [reportUsers],
  )

  const statusSegments = useMemo(() => {
    const counts = filteredProjects.reduce<Record<string, number>>((accumulator, project) => {
      const key = buildProjectSegmentLabel(project)
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

    return [
      { label: 'Completed', value: counts.Completed || 0, color: '#22c55e' },
      { label: 'Planning', value: counts.Planning || 0, color: '#f59e0b' },
      { label: 'Review', value: counts.Review || 0, color: '#94a3b8' },
      { label: 'In Progress', value: counts['In Progress'] || 0, color: '#0f766e' },
      { label: 'Delayed', value: counts.Delayed || 0, color: '#ef4444' },
    ]
  }, [filteredProjects])

  const taskSegments = useMemo(() => {
    const counts = filteredTasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = buildTaskSegmentLabel(task.status)
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

    return [
      { label: 'Completed', value: counts.Completed || 0, color: '#22c55e' },
      { label: 'In Review', value: counts['In Review'] || 0, color: '#8b5cf6' },
      { label: 'In Progress', value: counts['In Progress'] || 0, color: '#0f766e' },
      { label: 'To Do', value: counts['To Do'] || 0, color: '#94a3b8' },
    ]
  }, [filteredTasks])

  const roleBreakdown = useMemo(() => {
    const counts = reportUsers.reduce<Record<string, number>>((accumulator, entry) => {
      const key = normalizeRole(entry.roleName)
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

    return ['ProjectManager', 'TeamMember'].map((role) => ({
      label: roleLabel(role),
      value: counts[role] || 0,
    }))
  }, [reportUsers])

  const completionRate = filteredTasks.length
    ? Math.round((filteredTasks.filter((task) => buildTaskSegmentLabel(task.status) === 'Completed').length / filteredTasks.length) * 100)
    : 0

  const summaryRows = useMemo(() => {
    const totalProjects = filteredProjects.length || 1

    return statusSegments
      .map((segment) => {
        const groupedProjects = filteredProjects.filter((project) => buildProjectSegmentLabel(project) === segment.label)
        const averageProgress = groupedProjects.length
          ? Math.round(groupedProjects.reduce((sum, project) => sum + getProjectProgress(project), 0) / groupedProjects.length)
          : 0

        return {
          label: segment.label,
          count: segment.value,
          share: `${Math.round((segment.value / totalProjects) * 100)}%`,
          averageProgress: `${averageProgress}%`,
        }
      })
      .filter((segment) => segment.count > 0)
  }, [filteredProjects, statusSegments])

  const projectSummary = useMemo(() => {
    const completedProjects = filteredProjects.filter((project) => normalizeProjectStatus(project.status) === 'Completed').length
    const ongoingProjects = filteredProjects.filter((project) => {
      const status = normalizeProjectStatus(project.status)
      return status !== 'Completed' && status !== 'Cancelled'
    }).length
    const activeMembers = new Set(filteredTasks.map((task) => task.assignedToUserId).filter(Boolean)).size
    const completedTasks = taskSegments.find((segment) => segment.label === 'Completed')?.value || 0

    return {
      completedProjects,
      ongoingProjects,
      activeMembers,
      completedTasks,
    }
  }, [filteredProjects, filteredTasks, taskSegments])

  function applyFilters() {
    setFilterStartDate(draftStartDate)
    setFilterEndDate(draftEndDate)
  }

  function exportSummary(format: 'csv' | 'json') {
    const payload = {
      startDate: filterStartDate,
      endDate: filterEndDate,
      generatedAt: new Date().toISOString(),
      projectCount: filteredProjects.length,
      activeProjects: countActiveProjects(filteredProjects),
      completionRate,
      taskTotals: {
        total: filteredTasks.length,
        completed: projectSummary.completedTasks,
      },
      roleBreakdown,
      statusBreakdown: summaryRows,
    }

    if (format === 'json') {
      downloadFile('workspace-report.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    } else {
      const rows = [
        ['Metric', 'Value'],
        ['Project Count', String(payload.projectCount)],
        ['Active Projects', String(payload.activeProjects)],
        ['Completion Rate', `${payload.completionRate}%`],
        ['Tracked Tasks', String(payload.taskTotals.total)],
        ['Completed Tasks', String(payload.taskTotals.completed)],
        ...payload.statusBreakdown.map((row) => [row.label, `${row.count} (${row.share})`]),
      ]

      const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
      downloadFile('workspace-report.csv', csv, 'text/csv;charset=utf-8')
    }

    toast.success(`Report exported as ${format.toUpperCase()}`)
  }

  function printReport() {
    printReportElement(reportContentRef.current, {
      title: 'Workspace Report',
      subtitle: `Period: ${filterStartDate} to ${filterEndDate}`,
    })
  }

  function saveAsPdf() {
    printReport()
  }

  return (
    <div ref={reportContentRef} className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section data-print-hide="true" className="flex flex-wrap items-end justify-end gap-3">
        <span className="text-sm font-medium text-slate-500">From</span>
        <input
          type="date"
          value={draftStartDate}
          onChange={(event) => setDraftStartDate(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
        />
        <span className="text-sm font-medium text-slate-500">To</span>
        <input
          type="date"
          value={draftEndDate}
          onChange={(event) => setDraftEndDate(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
        />
        <Button leftIcon={<Filter size={16} />} onClick={applyFilters}>Filter</Button>
        <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={printReport}>Print</Button>
        <Button variant="secondary" leftIcon={<Download size={16} />} onClick={saveAsPdf}>PDF</Button>
      </section>

      <div data-print-grid="4" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Total Users" value={reportUsers.length} helper={`${activeUsers} active • ${Math.max(reportUsers.length - activeUsers, 0)} inactive`} icon={<Users size={18} />} tone="sky" />
        <AdminMetricCard label="Projects" value={filteredProjects.length} helper={`${projectSummary.completedProjects} completed • ${projectSummary.ongoingProjects} ongoing`} icon={<FolderKanban size={18} />} tone="emerald" />
        <AdminMetricCard label="Tasks" value={`${projectSummary.completedTasks}/${filteredTasks.length}`} helper={`${completionRate}% completed`} icon={<CheckSquare size={18} />} tone="amber" />
        <AdminMetricCard label="Active Members" value={projectSummary.activeMembers} helper={`${projectSummary.activeMembers} members with assigned tasks`} icon={<BarChart3 size={18} />} tone="slate" />
      </div>

      <div data-print-grid="2" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Project Status" subtitle={`Distribution of ${filteredProjects.length} projects`}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState title="No report data yet" message="Projects created in the selected time window will appear here." />
          ) : (
            <RadialSummaryChart title="Project Status" totalLabel="Distribution of projects in the current range" segments={statusSegments} />
          )}
        </Card>

        <Card title="Task Summary" subtitle="Breakdown of all tasks by current status">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState title="No task data yet" message="Task status breakdown will appear once projects contain tracked tasks." />
          ) : (
            <RadialSummaryChart title="Task Summary" totalLabel="Breakdown of all tasks by current status" segments={taskSegments} />
          )}
        </Card>
      </div>

      <Card title="Project Breakdown" subtitle="All projects grouped by status with progress">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : summaryRows.length === 0 ? (
          <EmptyState title="No status data available" message="Once projects are tracked, the report summary will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Projects</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">% of Total</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Avg. Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryRows.map((row) => (
                  <tr key={row.label} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.label}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.count}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.share}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{row.averageProgress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div data-print-hide="true" className="flex justify-end gap-3">
        <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportSummary('csv')}>
          Export CSV
        </Button>
        <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportSummary('json')}>
          Export JSON
        </Button>
      </div>
    </div>
  )
}