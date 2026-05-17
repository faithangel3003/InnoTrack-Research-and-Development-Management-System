import { Activity, BarChart3, Download, FileStack, Gauge, Layers3, Printer, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import * as userApi from '../../api/userApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { RadialSummaryChart } from '../../components/admin/RadialSummaryChart'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../context/ToastContext'
import { printReportElement } from '../../utils/printReport'
import { countActiveProjects, getProjectTaskTotals, normalizeProjectStatus } from '../../utils/projectMetrics'
import { normalizeRole } from '../../utils/roleHelpers'

const reportCatalog = [
  { name: 'Innovation Pipeline Summary', cadence: 'Weekly', audience: 'Executive Team', status: 'Live' },
  { name: 'Research Throughput Overview', cadence: 'Monthly', audience: 'Operations', status: 'Live' },
  { name: 'Collaboration Activity Digest', cadence: 'Weekly', audience: 'Project Leads', status: 'Reviewing' },
  { name: 'Compliance Exceptions Report', cadence: 'Daily', audience: 'Organization Admin', status: 'Live' },
]

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

export function InnovationAnalyticsPage() {
  const toast = useToast()
  const analyticsContentRef = useRef<HTMLDivElement | null>(null)
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [users, setUsers] = useState<userApi.User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    let active = true

    async function loadAnalytics() {
      setLoading(true)
      try {
        const [projectData, userData] = await Promise.all([
          projectApi.getAllProjects(),
          userApi.getAllUsers({ page: 1, pageSize: 250, isActive: true }),
        ])

        if (!active) return
        setProjects(projectData)
        setUsers(userData.data.filter((entry) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(entry.roleName))))
        setError('')
        setLastUpdated(new Date().toLocaleString())
      } catch (loadError) {
        if (!active) return
        setProjects([])
        setUsers([])
        setError(loadError instanceof Error ? loadError.message : 'Failed to load innovation analytics')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAnalytics()

    return () => {
      active = false
    }
  }, [])

  const taskTotals = useMemo(() => getProjectTaskTotals(projects), [projects])
  const completionRate = taskTotals.total ? Math.round((taskTotals.completed / taskTotals.total) * 100) : 0
  const activeProjects = useMemo(() => countActiveProjects(projects), [projects])
  const projectHealth = projects.length ? Math.round((activeProjects / projects.length) * 100) : 0
  const contributorDensity = users.length ? (taskTotals.total / users.length).toFixed(1) : '0.0'

  const statusSegments = useMemo(() => {
    const counts = projects.reduce<Record<string, number>>((accumulator, project) => {
      const label = normalizeProjectStatus(project.status)
      accumulator[label] = (accumulator[label] || 0) + 1
      return accumulator
    }, {})

    return [
      { label: 'Active', value: counts.Active || counts['In Progress'] || 0, color: '#0f766e' },
      { label: 'Completed', value: counts.Completed || 0, color: '#16a34a' },
      { label: 'On Hold', value: counts['On Hold'] || 0, color: '#f59e0b' },
      { label: 'Cancelled', value: counts.Cancelled || 0, color: '#ef4444' },
    ]
  }, [projects])

  const taskSegments = useMemo(() => [
    { label: 'Completed', value: taskTotals.completed, color: '#0f766e' },
    { label: 'Remaining', value: Math.max(taskTotals.total - taskTotals.completed, 0), color: '#cbd5e1' },
  ], [taskTotals.completed, taskTotals.total])

  const dominantStatus = useMemo(() => {
    return statusSegments.reduce<(typeof statusSegments)[number] | null>((current, segment) => {
      if (!current || segment.value > current.value) {
        return segment
      }

      return current
    }, null)
  }, [statusSegments])

  const analyticsNarrative = projectHealth >= 70 && completionRate >= 60
    ? 'Delivery momentum is healthy and the current portfolio mix is stable.'
    : projectHealth >= 50
      ? 'The portfolio is moving, but active execution needs tighter follow-through.'
      : 'The portfolio is carrying more stalled work than active delivery. Focus on reactivation or closure.'

  function exportAnalytics(format: 'csv' | 'json') {
    const payload = {
      generatedAt: new Date().toISOString(),
      projects: projects.length,
      activeProjects,
      contributors: users.length,
      taskTotals,
      completionRate,
      projectHealth,
      statusSegments,
    }

    if (format === 'json') {
      downloadFile('innovation-analytics.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
      return
    }

    const rows = [
      ['Metric', 'Value'],
      ['Projects', String(payload.projects)],
      ['Active Projects', String(payload.activeProjects)],
      ['Contributors', String(payload.contributors)],
      ['Task Completion Rate', `${payload.completionRate}%`],
      ['Portfolio Health', `${payload.projectHealth}%`],
    ]
    downloadFile('innovation-analytics.csv', rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n'), 'text/csv;charset=utf-8')
  }

  function printAnalytics() {
    try {
      printReportElement(analyticsContentRef.current, {
        title: 'Innovation Analytics',
        subtitle: lastUpdated ? `Updated ${lastUpdated}` : 'Innovation analytics snapshot',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open the print preview')
    }
  }

  return (
    <div ref={analyticsContentRef} className="space-y-6">
      <div data-print-hide="true" className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={printAnalytics}>Print</Button>
        <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportAnalytics('csv')}>CSV</Button>
        <Button variant="secondary" leftIcon={<Download size={16} />} onClick={() => exportAnalytics('json')}>JSON</Button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_45%),linear-gradient(135deg,#f8fbff_0%,#eff6ff_42%,#f8fafc_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles size={14} /> Executive Snapshot
              </div>
              <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-900">Innovation delivery at a glance</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{analyticsNarrative}</p>
            </div>

            <div className="rounded-full bg-white/80 px-4 py-2 text-right shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{loading ? 'Syncing' : error ? 'Needs attention' : 'Live analytics'}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Portfolio health', value: `${projectHealth}%`, detail: `${activeProjects} active of ${projects.length} tracked projects`, icon: <Gauge size={18} className="text-sky-700" /> },
              { label: 'Execution density', value: contributorDensity, detail: 'Tasks per active contributor', icon: <Layers3 size={18} className="text-emerald-700" /> },
              { label: 'Report readiness', value: `${reportCatalog.filter((item) => item.status === 'Live').length}/${reportCatalog.length}`, detail: 'Configured catalog items currently live', icon: <FileStack size={18} className="text-amber-700" /> },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/70 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  {item.icon}
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <Target size={14} className="text-sky-700" />
              {dominantStatus && dominantStatus.value > 0 ? `${dominantStatus.label} is the largest project state` : 'Waiting for project status data'}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <Users size={14} className="text-emerald-700" />
              {users.length} active contributors in scope
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
              <Activity size={14} className="text-amber-700" />
              {lastUpdated ? `Updated ${lastUpdated}` : 'Awaiting first sync'}
            </div>
          </div>
        </div>

        <Card title="Report Catalog" subtitle="Configured analytics deliverables for operations and leadership reporting.">
          <div className="space-y-3">
            {reportCatalog.map((item) => (
              <div key={item.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:border-sky-200 hover:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.cadence} delivery for {item.audience}</p>
                  </div>
                  <Badge variant={item.status === 'Live' ? 'success' : 'warning'} text={item.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section data-print-grid="4" className="grid gap-4 xl:grid-cols-4">
        <AdminMetricCard label="Portfolio Health" value={`${projectHealth}%`} helper={`${activeProjects}/${projects.length} projects active`} icon={<TrendingUp size={18} />} tone="sky" />
        <AdminMetricCard label="Completion Rate" value={`${completionRate}%`} helper={`${taskTotals.completed}/${taskTotals.total} tasks completed`} icon={<BarChart3 size={18} />} tone="emerald" />
        <AdminMetricCard label="Active Contributors" value={users.length} helper="Project-facing users only" icon={<Users size={18} />} tone="amber" />
        <AdminMetricCard label="Activity Signals" value={taskTotals.total + projects.length} helper="Projects plus task activity tracked" icon={<Activity size={18} />} tone="slate" />
      </section>

      {loading ? <p className="text-sm text-slate-400">Refreshing innovation analytics...</p> : null}

      <section data-print-grid="2" className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card title="Innovation Performance" subtitle="Live project delivery and task completion distribution.">
          {projects.length === 0 && taskTotals.total === 0 ? (
            <EmptyState title="No analytics data yet" message="Create projects and tasks to generate innovation analytics." />
          ) : (
            <div data-print-grid="2" className="grid gap-6 2xl:grid-cols-2">
              <RadialSummaryChart title="Project Status" totalLabel="Portfolio distribution" segments={statusSegments} />
              <RadialSummaryChart title="Task Completion" totalLabel="Completed versus remaining work" segments={taskSegments} />
            </div>
          )}
        </Card>

        <Card title="Trend Indicators" subtitle="Operational indicators derived from current workspace data.">
          <div className="space-y-3">
            {[
              { label: 'Portfolio health', value: `${projectHealth}%`, detail: 'Share of active delivery projects' },
              { label: 'Execution completion', value: `${completionRate}%`, detail: 'Tasks already marked complete' },
              { label: 'Contributor density', value: contributorDensity, detail: 'Tracked tasks per contributor' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
                <span className="text-2xl font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section data-print-grid="2" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Insight Workflow" subtitle="How the service packages operational data into decision support.">
          <div className="space-y-4">
            {[
              { title: 'Signal collection', detail: 'Projects, task states, contributors, and delivery timelines feed the analytics layer.' },
              { title: 'Distribution visibility', detail: 'Radial breakdowns spotlight where portfolio load and delivery progress are concentrated.' },
              { title: 'Printable analytics', detail: 'Use Print for browser PDF output, or export CSV/JSON for review packets.' },
            ].map((item, index) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-sky-700 shadow-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Reporting SLA</p>
                <p className="mt-1 text-sm text-emerald-700">Analytics are recalculated from current workspace data on page load.</p>
              </div>
              <Badge variant="success" text="Live" />
            </div>
          </div>
        </Card>

        <Card title="Actionable Summary" subtitle="Useful context for admin reviews and leadership updates.">
          <div className="space-y-4">
            {[
              {
                title: 'Current portfolio mix',
                detail: dominantStatus && dominantStatus.value > 0
                  ? `${dominantStatus.label} currently represents the largest share of tracked projects.`
                  : 'Once projects are added, the largest portfolio segment will be highlighted here.',
              },
              {
                title: 'Delivery pressure',
                detail: taskTotals.total > 0
                  ? `${taskTotals.total - taskTotals.completed} tasks remain open across the workspace.`
                  : 'No tracked tasks yet. As teams add work, open-item pressure will appear here.',
              },
              {
                title: 'Contributor coverage',
                detail: users.length > 0
                  ? `${users.length} contributors are included in this reporting slice.`
                  : 'No project-facing contributors are currently available for analytics.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}