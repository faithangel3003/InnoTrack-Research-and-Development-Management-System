import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { ReportPreview, ReportType } from '../../../types/superAdmin'
import { ChartContainer } from '../../ui/ChartContainer'

type ReportPreviewPanelProps = {
  preview: ReportPreview
  previewType: ReportType
  isDownloading: boolean
  onClose: () => void
  onDownload: () => Promise<void>
}

const previewColors = ['#0f172a', '#3b82f6', '#f97316', '#a855f7']

export function ReportPreviewPanel({ preview, previewType, isDownloading, onClose, onDownload }: ReportPreviewPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-slide-up">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Preview: {previewType === 'revenue' ? 'Revenue' : 'Payment'}</h3>
          <p className="mt-1 text-sm text-slate-400">{preview.startDate} – {preview.endDate}</p>
        </div>
        <button data-print-hide="true" type="button" onClick={onClose} className="text-slate-400 transition hover:text-slate-600">Close ×</button>
      </div>

      <div data-print-grid="3" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryItem label="Total Revenue" value={`₱${preview.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <SummaryItem label="Total Companies" value={`${preview.totalCompanies}`} />
        <SummaryItem label="Total Invoices" value={`${preview.totalInvoices}`} />
        <SummaryItem label="Paid" value={`${preview.paid}`} />
        <SummaryItem label="Pending" value={`${preview.pending}`} />
        <SummaryItem label="Failed" value={`${preview.failed}`} />
      </div>

      {previewType === 'revenue' ? (
        <div className="mt-6 min-w-0 rounded-2xl border border-slate-100 p-4">
          <h4 className="mb-4 text-sm font-semibold text-slate-900">Monthly Breakdown</h4>
          <ChartContainer className="h-[180px] min-w-0">
            {({ width, height }) => (
              <BarChart width={width} height={height} data={preview.monthlyBreakdown}>
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value) => [`₱${Number(value ?? 0).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ChartContainer>
        </div>
      ) : (
        <div data-print-grid="2" className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
          <div className="min-w-0 rounded-2xl border border-slate-100 p-4">
            <h4 className="mb-4 text-sm font-semibold text-slate-900">Status Distribution</h4>
            <ChartContainer className="h-[220px] min-w-0">
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie data={preview.statusDistribution} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90}>
                    {preview.statusDistribution.map((entry, index) => (
                      <Cell key={entry.status} fill={previewColors[index % previewColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Number(value ?? 0)}`, 'Count']} />
                </PieChart>
              )}
            </ChartContainer>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4">
            <h4 className="mb-4 text-sm font-semibold text-slate-900">Top 5 Company Payments</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.topCompanyPayments.map((item) => (
                    <tr key={item.companyName} className="border-t border-slate-100 text-sm text-slate-700">
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.companyName}</td>
                      <td className="px-4 py-3">₱{item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">{item.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div data-print-hide="true" className="mt-6 flex justify-end">
        <button type="button" onClick={() => void onDownload()} disabled={isDownloading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
          {isDownloading ? 'Generating...' : 'Download Report ↓'}
        </button>
      </div>
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  )
}