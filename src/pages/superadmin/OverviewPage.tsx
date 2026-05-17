import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Building2, Database, FolderKanban } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getAuditLogs, getOverviewMetrics } from '../../lib/api'
import { Card, CardDescription, CardTitle, Skeleton } from '../../components/ui'

const signupData = [
  { day: 'Mar 22', value: 22 },
  { day: 'Mar 27', value: 31 },
  { day: 'Apr 1', value: 43 },
  { day: 'Apr 6', value: 36 },
  { day: 'Apr 11', value: 57 },
  { day: 'Apr 16', value: 62 },
  { day: 'Apr 20', value: 70 },
]

const lifecycleData = [
  { stage: 'Ideation', count: 210 },
  { stage: 'Research', count: 331 },
  { stage: 'Development', count: 240 },
  { stage: 'Testing', count: 109 },
  { stage: 'Launch', count: 42 },
]

const roleData = [
  { name: 'super_admin', value: 8 },
  { name: 'admin', value: 140 },
  { name: 'researcher', value: 3322 },
  { name: 'viewer', value: 1342 },
]

const storageData = [
  { time: 'Jan', uploads: 184, storage: 6.5 },
  { time: 'Feb', uploads: 230, storage: 7.9 },
  { time: 'Mar', uploads: 305, storage: 9.8 },
  { time: 'Apr', uploads: 352, storage: 12.8 },
]

const healthData = [
  { label: 'DB Connection', value: 'Healthy', status: 'ok' },
  { label: 'Storage Quota', value: '68% used', status: 'warning' },
  { label: 'Edge Invocations', value: '1.2M / 24h', status: 'ok' },
  { label: 'Error Rate', value: '0.11%', status: 'ok' },
]

const roleColors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']

function CountUpValue({ value }: { value: string }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const numeric = Number(value.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setDisplay(value)
      return
    }

    const duration = 800
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(numeric * eased)
      setDisplay(value.replace(/\d[\d,.]*/, current.toLocaleString()))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{display}</>
}

const kpiIconConfig = [
  { icon: Building2, className: 'kpi-icon kpi-icon-blue' },
  { icon: Activity, className: 'kpi-icon kpi-icon-green' },
  { icon: FolderKanban, className: 'kpi-icon kpi-icon-orange' },
  { icon: Database, className: 'kpi-icon kpi-icon-yellow' },
]

export function OverviewPage() {
  const metricsQuery = useQuery({ queryKey: ['overview', 'metrics'], queryFn: getOverviewMetrics })
  const activityQuery = useQuery({ queryKey: ['overview', 'activity'], queryFn: getAuditLogs })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
      <section className="page-header">
        <h1>SuperAdmin Control Plane</h1>
        <p>System-wide governance, monitoring, and platform configuration.</p>
      </section>

      <section className="kpi-grid">
        {metricsQuery.isLoading && Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="kpi-skeleton" />)}
        {metricsQuery.data?.map((metric, idx) => {
          const config = kpiIconConfig[idx % kpiIconConfig.length]
          const Icon = config.icon
          return (
          <motion.div key={metric.title} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 250, damping: 20 }}>
            <Card className="kpi-card">
              <div className="kpi-row">
                <span className={config.className}>
                  <Icon size={16} />
                </span>
                <CardDescription>{metric.title}</CardDescription>
              </div>
              <CardTitle className="kpi-value"><CountUpValue value={metric.value} /></CardTitle>
              <p className="kpi-meta">{metric.delta ? `${metric.delta} from last month` : metric.subtitle}</p>
            </Card>
          </motion.div>
          )
        })}
      </section>

      <section className="chart-grid">
        <Card>
          <CardTitle>User Signups (30 days)</CardTitle>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <LineChart data={signupData}>
                <CartesianGrid stroke="var(--border-faint)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Projects by Lifecycle Stage</CardTitle>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <BarChart data={lifecycleData}>
                <CartesianGrid stroke="var(--border-faint)" vertical={false} />
                <XAxis dataKey="stage" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Role Distribution</CardTitle>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={roleData} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={3}>
                  {roleData.map((_, idx) => (
                    <Cell key={idx} fill={roleColors[idx % roleColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Uploads & Storage Growth</CardTitle>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <AreaChart data={storageData}>
                <CartesianGrid stroke="var(--border-faint)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--muted)" />
                <YAxis yAxisId="left" stroke="var(--muted)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--muted)" />
                <Tooltip />
                <Area yAxisId="left" type="monotone" dataKey="uploads" stroke="var(--chart-3)" fill="var(--chart-3-faint)" />
                <Area yAxisId="right" type="monotone" dataKey="storage" stroke="var(--chart-4)" fill="var(--chart-4-faint)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="double-grid">
        <Card>
          <CardTitle>Recent Critical Activity</CardTitle>
          <div className="feed-list">
            {(activityQuery.data ?? []).slice(0, 10).map((event) => (
              <article key={event.id} className="feed-item">
                <div>
                  <strong>{event.action}</strong>
                  <p>{event.actor_name} · {event.actor_org}</p>
                </div>
                <span>{event.created_at}</span>
              </article>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>System Health</CardTitle>
          <div className="health-grid">
            {healthData.map((item) => (
              <article key={item.label} className="health-item">
                <p>{item.label}</p>
                <div>
                  <strong>{item.value}</strong>
                  <span className={`status-dot ${item.status}`} />
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </motion.div>
  )
}
