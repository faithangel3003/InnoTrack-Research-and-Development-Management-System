import { LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { RevenuePoint } from '../../../types/superAdmin'
import { ChartContainer } from '../../ui/ChartContainer'

type RevenueTrendChartProps = {
  data: RevenuePoint[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Revenue Trend</h2>
          <p className="mt-1 text-sm text-slate-400">Last 6 months</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          Revenue
        </div>
      </div>

      <ChartContainer className="mt-6 h-[280px] min-w-0">
        {({ width, height }) => (
          <LineChart width={width} height={height} data={data}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
              }}
              formatter={(value) => [`₱${Number(value ?? 0).toLocaleString()}`, 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ fill: '#0f172a', r: 4 }}
              activeDot={{ fill: '#0f172a', r: 6 }}
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  )
}