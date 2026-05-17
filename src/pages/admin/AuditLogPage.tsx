import { RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { useAuditLogs } from '../../hooks/useAuditLogs'
import { truncate } from '../../utils/maskData'

function formatTimestamp(value: string) {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return { date: '-', time: '' }
  }

  return {
    date: timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

export function AuditLogPage() {
  const { logs, loading, error, total, page, pageSize, totalPages, setPage, fetchLogs } = useAuditLogs()
  const [actionFilter, setActionFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [rangePreset, setRangePreset] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const actions = useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.action))).filter(Boolean)
    return [{ value: '', label: 'All Actions' }, ...values.map((value) => ({ value, label: value }))]
  }, [logs])

  const modules = useMemo(() => {
    const values = Array.from(new Set(logs.map((log) => log.module))).filter(Boolean)
    return [{ value: '', label: 'All Resources' }, ...values.map((value) => ({ value, label: value }))]
  }, [logs])

  const displayedLogs = useMemo(() => {
    return logs.filter((log) => {
      const text = `${log.userName || ''} ${log.userEmail || ''} ${log.action || ''} ${log.details || ''}`.toLowerCase()
      const searchMatch = !searchText || text.includes(searchText.toLowerCase())
      const actionMatch = !actionFilter || log.action === actionFilter
      const moduleMatch = !moduleFilter || log.module === moduleFilter
      const timestamp = new Date(log.timestampUtc)
      const now = new Date()

      let rangeMatch = true
      if (rangePreset === 'today') {
        rangeMatch = timestamp.toDateString() === now.toDateString()
      } else if (rangePreset === 'week') {
        rangeMatch = now.getTime() - timestamp.getTime() <= 7 * 24 * 60 * 60 * 1000
      } else if (rangePreset === 'month') {
        rangeMatch = now.getTime() - timestamp.getTime() <= 30 * 24 * 60 * 60 * 1000
      }

      return searchMatch && actionMatch && moduleMatch && rangeMatch
    })
  }, [actionFilter, logs, moduleFilter, rangePreset, searchText])
  const visibleRangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const visibleRangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] xl:grid-cols-[minmax(0,1.5fr)_220px_220px_180px_56px]">
        <Input
          placeholder="Search audit logs..."
          leftIcon={<Search size={14} />}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <Select options={actions} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} />
        <Select options={modules} value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} />
        <Select
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Last 7 Days' },
            { value: 'month', label: 'Last 30 Days' },
            { value: 'all', label: 'All Time' },
          ]}
          value={rangePreset}
          onChange={(event) => setRangePreset(event.target.value as typeof rangePreset)}
        />
        <button
          type="button"
          onClick={() => void fetchLogs({ page: 1 })}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          title="Refresh audit logs"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden" padding="sm">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : displayedLogs.length === 0 ? (
          <EmptyState title="No audit logs" message="No records match your current filters." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead>
                  <tr>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Timestamp</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">User</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Action</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Details</th>
                    <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedLogs.map((log) => {
                    const fullName = log.userName || log.userEmail || log.userId || 'System'
                    const timestamp = formatTimestamp(log.timestampUtc)

                    return (
                      <tr key={log.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-slate-900">{timestamp.date}</p>
                          <p className="mt-1 text-xs text-slate-400">{timestamp.time}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                              <p className="text-xs text-slate-400">{log.userEmail || 'System generated event'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm font-medium text-slate-700">{log.action}</td>
                        <td className="px-4 py-4 align-top text-sm leading-6 text-slate-600">{truncate(log.details || `${log.module} activity recorded`, 120)}</td>
                        <td className="px-4 py-4 align-top text-sm text-slate-500">{log.ipAddress || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-sm text-slate-500">
                Showing {visibleRangeStart}-{visibleRangeEnd} of {total} audit logs
              </p>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  void fetchLogs({ page: nextPage })
                }}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
