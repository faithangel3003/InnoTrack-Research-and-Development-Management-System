import type { Project } from '../api/projectApi'

export function normalizeProjectStatus(status?: string) {
  const value = (status || 'Planned').toLowerCase()

  if (value.includes('complete')) return 'Completed'
  if (value.includes('progress') || value.includes('active')) return 'In Progress'
  if (value.includes('review')) return 'In Review'
  if (value.includes('hold')) return 'On Hold'
  if (value.includes('cancel')) return 'Cancelled'
  return status || 'Planned'
}

export function getProjectProgress(project: Project) {
  if (project.totalTasks <= 0) {
    return normalizeProjectStatus(project.status) === 'Completed' ? 100 : 0
  }

  return Math.round((project.completedTasks / project.totalTasks) * 100)
}

export function isProjectComplete(project: Project) {
  return normalizeProjectStatus(project.status) === 'Completed' || getProjectProgress(project) >= 100
}

export function isProjectOverdue(project: Project, now = new Date()) {
  const endDate = new Date(project.endDate)
  return !Number.isNaN(endDate.getTime()) && !isProjectComplete(project) && endDate.getTime() < now.getTime()
}

export function countActiveProjects(projects: Project[]) {
  return projects.filter((project) => {
    const status = normalizeProjectStatus(project.status)
    return status !== 'Completed' && status !== 'Cancelled'
  }).length
}

export function getProjectTaskTotals(projects: Project[]) {
  return projects.reduce(
    (accumulator, project) => ({
      total: accumulator.total + project.totalTasks,
      completed: accumulator.completed + project.completedTasks,
    }),
    { total: 0, completed: 0 },
  )
}

export function projectStatusClasses(status?: string) {
  const value = normalizeProjectStatus(status)

  switch (value) {
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700'
    case 'In Progress':
      return 'bg-sky-50 text-sky-700'
    case 'In Review':
      return 'bg-amber-50 text-amber-700'
    case 'On Hold':
      return 'bg-orange-50 text-orange-700'
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function projectPriorityClasses(priority?: string) {
  const value = (priority || '').toLowerCase()

  if (value.includes('critical')) return 'bg-rose-50 text-rose-700'
  if (value.includes('high')) return 'bg-orange-50 text-orange-700'
  if (value.includes('medium')) return 'bg-amber-50 text-amber-700'
  return 'bg-emerald-50 text-emerald-700'
}