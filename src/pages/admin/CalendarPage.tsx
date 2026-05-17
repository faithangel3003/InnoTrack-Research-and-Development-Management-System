import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FolderKanban, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import { AdminMetricCard } from '../../components/admin/AdminMetricCard'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { classNames } from '../../utils/classNames'
import { formatDate } from '../../utils/formatDate'

type CalendarEvent = {
  id: string
  title: string
  detail: string
  date: Date
  tone: 'sky' | 'amber' | 'rose'
}

function eventToneClasses(tone: CalendarEvent['tone']) {
  if (tone === 'rose') return 'bg-rose-50 text-rose-700'
  if (tone === 'amber') return 'bg-amber-50 text-amber-700'
  return 'bg-sky-50 text-sky-700'
}

export function CalendarPage() {
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [lastSyncedAt, setLastSyncedAt] = useState('')
  const [referenceNow, setReferenceNow] = useState(() => Date.now())

  const loadProjects = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const data = await projectApi.getAllProjects()
      setProjects(data)
      setLastSyncedAt(new Date().toISOString())
      setError('')
    } catch (loadError) {
      setProjects([])
      setError(loadError instanceof Error ? loadError.message : 'Failed to load calendar data')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadProjects()
    const interval = window.setInterval(() => void loadProjects(false), 15000)
    const refreshOnFocus = () => void loadProjects(false)
    window.addEventListener('focus', refreshOnFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
    }
  }, [loadProjects])

  useEffect(() => {
    setReferenceNow(Date.now())
  }, [projects])

  const events = useMemo<CalendarEvent[]>(() => {
    return projects.flatMap((project) => {
      const startDate = new Date(project.startDate)
      const endDate = new Date(project.endDate)
      const items: CalendarEvent[] = []

      if (!Number.isNaN(startDate.getTime())) {
        items.push({
          id: `${project.id}-kickoff`,
          title: `${project.title} kickoff`,
          detail: 'Project start date and team alignment session.',
          date: startDate,
          tone: 'sky',
        })
      }

      if (!Number.isNaN(endDate.getTime())) {
        items.push({
          id: `${project.id}-review`,
          title: `${project.title} milestone review`,
          detail: 'Checkpoint for delivery readiness and outstanding tasks.',
          date: endDate,
          tone: endDate.getTime() < referenceNow ? 'rose' : 'amber',
        })
      }

      return items
    }).sort((left, right) => left.date.getTime() - right.date.getTime())
  }, [projects, referenceNow])

  const calendarDays = useMemo(() => {
    const intervalStart = startOfWeek(startOfMonth(currentMonth))
    const intervalEnd = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start: intervalStart, end: intervalEnd })
  }, [currentMonth])

  const monthEvents = useMemo(() => events.filter((event) => isSameMonth(event.date, currentMonth)), [currentMonth, events])
  const selectedEvents = useMemo(() => events.filter((event) => isSameDay(event.date, selectedDate)), [events, selectedDate])
  const upcomingEvents = useMemo(() => events.filter((event) => event.date >= new Date()).slice(0, 5), [events])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Monthly Events" value={monthEvents.length} helper="Kickoffs and milestone reviews in the selected month" icon={<CalendarDays size={18} />} tone="sky" />
        <AdminMetricCard label="Kickoffs" value={monthEvents.filter((event) => event.tone === 'sky').length} helper="Project starts scheduled this month" icon={<FolderKanban size={18} />} tone="emerald" />
        <AdminMetricCard label="Milestones" value={monthEvents.filter((event) => event.tone === 'amber').length} helper="Upcoming checkpoints and review dates" icon={<Clock3 size={18} />} tone="amber" />
        <AdminMetricCard label="At Risk" value={monthEvents.filter((event) => event.tone === 'rose').length} helper="Past-due or overdue milestone dates" icon={<Clock3 size={18} />} tone="rose" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card
          title="Project Calendar"
          subtitle="Map research and development milestones to a single planning surface."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} leftIcon={<ChevronLeft size={14} />}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setCurrentMonth(startOfMonth(new Date())); setSelectedDate(new Date()) }}>
                Today
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void loadProjects(false)} leftIcon={<RefreshCw size={14} />}>
                Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} rightIcon={<ChevronRight size={14} />}>
                Next
              </Button>
            </div>
          }
        >
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
                  {lastSyncedAt ? <p className="mt-1 text-xs text-slate-400">Live sync {format(new Date(lastSyncedAt), 'h:mm:ss a')}</p> : null}
                </div>
              </div>

              <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const eventsForDay = events.filter((event) => isSameDay(event.date, day))
                  const selected = isSameDay(day, selectedDate)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={classNames(
                        'min-h-28 rounded-[1.25rem] border p-3 text-left transition',
                        selected ? 'border-sky-200 bg-sky-50/60' : 'border-slate-200 bg-white hover:bg-slate-50',
                        !isSameMonth(day, currentMonth) ? 'opacity-45' : '',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={classNames('text-sm font-semibold', isToday(day) ? 'text-sky-700' : 'text-slate-900')}>
                          {format(day, 'd')}
                        </span>
                        {eventsForDay.length ? <span className="text-[11px] text-slate-400">{eventsForDay.length} items</span> : null}
                      </div>

                      <div className="mt-3 space-y-2">
                        {eventsForDay.slice(0, 2).map((event) => (
                          <div key={event.id} className={classNames('rounded-xl px-2 py-1 text-[11px] font-medium', eventToneClasses(event.tone))}>
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        <Card title={format(selectedDate, 'EEEE, MMMM d')} subtitle="Selected day details and upcoming milestones.">
          {selectedEvents.length ? (
            <div className="space-y-4">
              {selectedEvents.map((event) => (
                <div key={event.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{event.detail}</p>
                    </div>
                    <span className={classNames('inline-flex rounded-full px-3 py-1 text-xs font-semibold', eventToneClasses(event.tone))}>
                      {formatDate(event.date.toISOString())}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No events for this day" message="Select another day to inspect scheduled milestone activity." />
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-sm font-semibold text-slate-900">Upcoming milestones</p>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length ? upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-400">{event.detail}</p>
                  </div>
                  <span className="text-sm text-slate-500">{format(event.date, 'MMM d')}</span>
                </div>
              )) : <p className="text-sm text-slate-500">No upcoming project milestones are scheduled.</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}