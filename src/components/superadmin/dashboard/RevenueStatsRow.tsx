type RevenueStatsRowProps = {
  totalRevenue: number
  growth: number
  averagePerMonth: number
}

function formatCompactPeso(value: number) {
  if (Math.abs(value) >= 1000) {
    return `₱${(value / 1000).toFixed(1)}K`
  }

  return `₱${Math.round(value).toLocaleString()}`
}

export function RevenueStatsRow({ totalRevenue, growth, averagePerMonth }: RevenueStatsRowProps) {
  const growthClass = growth >= 0 ? 'text-emerald-500' : 'text-red-500'
  const growthPrefix = growth >= 0 ? '+' : ''

  return (
    <div className="grid gap-6 border-t border-slate-100 pt-4 sm:grid-cols-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Total Revenue</div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{formatCompactPeso(totalRevenue)}</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Growth</div>
        <div className={`mt-2 text-2xl font-bold ${growthClass}`}>{growthPrefix}{growth.toFixed(1)}%</div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Avg/Month</div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{formatCompactPeso(averagePerMonth)}</div>
      </div>
    </div>
  )
}