import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardTitle, Input } from '../../components/ui'
import { getAuditLogs } from '../../lib/api'
import { supabase } from '../../lib/supabase'

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<'all' | 'info' | 'warning' | 'critical'>('all')
  const queryClient = useQueryClient()

  const logsQuery = useQuery({ queryKey: ['audit-logs'], queryFn: getAuditLogs })

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    const channel = client
      .channel('superadmin-audit')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [queryClient])

  const filtered = useMemo(
    () =>
      (logsQuery.data ?? []).filter((log) => {
        const matchesSearch =
          log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          log.entity_type.toLowerCase().includes(search.toLowerCase())
        const matchesSeverity = severity === 'all' || log.severity === severity
        return matchesSearch && matchesSeverity
      }),
    [logsQuery.data, search, severity],
  )

  return (
    <section>
      <div className="page-header row">
        <div>
          <h1>Audit Logs</h1>
          <p>Reverse-chronological activity stream with realtime updates.</p>
        </div>
        <Button className="button-ghost">Export CSV</Button>
      </div>

      <Card className="filters-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by actor, action, entity" />
        <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </Card>

      <Card>
        <CardTitle>Activity Stream</CardTitle>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td className="mono">{log.created_at}</td>
                  <td>{log.actor_name} · {log.actor_org}</td>
                  <td className="mono">{log.action}</td>
                  <td>{log.entity_type}</td>
                  <td className="mono">{log.ip_address}</td>
                  <td><span className={`badge ${log.severity}`}>{log.severity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
