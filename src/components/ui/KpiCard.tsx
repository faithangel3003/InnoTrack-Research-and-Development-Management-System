import type { ReactNode } from 'react'

type KpiCardProps = {
  icon: ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  trend?: string
  trendColor?: string
  loading?: boolean
}

export function KpiCard({ icon, iconBg, iconColor, label, value, trend, trendColor = 'text-slate-400', loading = false }: KpiCardProps) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm" />
  }

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      {trend ? <div className={`mt-2 text-sm font-medium ${trendColor}`}>{trend}</div> : null}
    </article>
  )
}