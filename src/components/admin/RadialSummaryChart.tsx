type ChartSegment = {
  label: string
  value: number
  color: string
}

type RadialSummaryChartProps = {
  title: string
  totalLabel: string
  segments: ChartSegment[]
}

export function RadialSummaryChart({ title, totalLabel, segments }: RadialSummaryChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const hasData = total > 0
  const size = 136
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const leadingSegment = segments.reduce<ChartSegment | null>((current, segment) => {
    if (!current || segment.value > current.value) {
      return segment
    }

    return current
  }, null)
  let progress = 0

  return (
    <div data-print-card="true" className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{totalLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{hasData ? total : '--'}</p>
          <p className="text-xs text-slate-400">{hasData ? 'tracked items' : 'awaiting data'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-col items-center justify-center gap-3 md:items-start md:w-[150px]">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                strokeDasharray={hasData ? undefined : '8 8'}
              />

              {hasData ? segments.map((segment) => {
                const dash = (segment.value / total) * circumference
                const circle = (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-progress}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                )
                progress += dash
                return circle
              }) : null}
            </svg>

            <div className="absolute text-center">
              <p className="text-2xl font-semibold tracking-tight text-slate-900">{hasData ? total : '--'}</p>
              <p className="mt-1 text-xs text-slate-400">{hasData ? 'items' : 'No data yet'}</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {segments.map((segment) => (
              <span
                key={segment.label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-1 lg:grid-cols-[minmax(0,140px)_minmax(0,1fr)] lg:items-start">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Primary signal</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {hasData && leadingSegment ? `${leadingSegment.label} leads this breakdown.` : 'This chart will populate as workspace activity is recorded.'}
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="divide-y divide-slate-100">
              {segments.map((segment) => {
                const share = total === 0 ? 0 : Math.round((segment.value / total) * 100)
                return (
                  <div key={segment.label} className="flex items-center justify-between gap-3 px-3 py-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="text-slate-600">{segment.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{segment.value} ({share}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
          Create projects, assign contributors, and move tasks through statuses to generate a usable analytics split.
        </div>
      ) : null}
    </div>
  )
}