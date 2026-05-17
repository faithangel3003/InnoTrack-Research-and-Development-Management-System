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
  const size = 176
  const strokeWidth = 18
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
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
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

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="relative mx-auto flex h-44 w-44 shrink-0 items-center justify-center lg:mx-0">
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
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{hasData ? total : '--'}</p>
            <p className="mt-1 text-sm text-slate-400">{hasData ? 'items' : 'No data yet'}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Primary signal</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {hasData && leadingSegment ? `${leadingSegment.label} leads this breakdown.` : 'This chart will populate as workspace activity is recorded.'}
            </p>
          </div>

          {segments.map((segment) => {
            const share = total === 0 ? 0 : Math.round((segment.value / total) * 100)
            return (
              <div key={segment.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-slate-600">{segment.label}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{segment.value} ({share}%)</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${share}%`, backgroundColor: segment.color }} />
                </div>
              </div>
            )
          })}

          {!hasData ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
              Create projects, assign contributors, and move tasks through statuses to generate a usable analytics split.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}