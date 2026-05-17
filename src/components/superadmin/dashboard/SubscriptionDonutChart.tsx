import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import type { SubscriptionDistributionItem } from '../../../types/superAdmin'
import { ChartContainer } from '../../ui/ChartContainer'

type SubscriptionDonutChartProps = {
  data: SubscriptionDistributionItem[]
}

const colors: Record<string, string> = {
  Enterprise: '#3b82f6',
  Professional: '#0f172a',
  Starter: '#f97316',
}

export function SubscriptionDonutChart({ data }: SubscriptionDonutChartProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Subscription Distribution</h2>
        <p className="mt-1 text-sm text-slate-400">Active plans breakdown</p>
      </div>

      <ChartContainer className="mt-4 h-[220px] min-w-0">
        {({ width, height }) => (
          <PieChart width={width} height={height}>
            <Pie data={data} dataKey="count" nameKey="plan" innerRadius={70} outerRadius={110} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.plan} fill={colors[entry.plan] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, _name, payload) => [`${Number(value ?? 0)}`, ((payload?.payload as { plan?: string } | undefined)?.plan) ?? 'Plan']} />
          </PieChart>
        )}
      </ChartContainer>

      <div className="mt-2 space-y-3">
        {data.map((item) => (
          <div key={item.plan} className="flex items-center justify-between gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[item.plan] || '#94a3b8' }} />
              <span>{item.plan}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{item.count}</span>
              <span className="text-slate-400">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}