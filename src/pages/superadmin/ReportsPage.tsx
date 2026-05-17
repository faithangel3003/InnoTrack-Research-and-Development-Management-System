import { useEffect, useRef, useState } from 'react'
import { BarChart2, BriefcaseBusiness, CreditCard, Download, Filter, Printer, Receipt, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import type { ReportDownloadParams, ReportPreviewParams, ReportType, SubscriptionSummary } from '../../types/superAdmin'
import { useReports } from '../../hooks/useReports'
import { useDashboard } from '../../hooks/useDashboard'
import * as subscriptionApi from '../../api/subscriptionApi'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { KpiCard } from '../../components/ui/KpiCard'
import { ChartContainer } from '../../components/ui/ChartContainer'
import { SubscriptionDonutChart } from '../../components/superadmin/dashboard/SubscriptionDonutChart'
import { ReportCard } from '../../components/superadmin/reports/ReportCard'
import { ReportFilterForm } from '../../components/superadmin/reports/ReportFilterForm'
import { ReportPreviewPanel } from '../../components/superadmin/reports/ReportPreviewPanel'
import { printReportElement } from '../../utils/printReport'

const subBreakdownColors: Record<string, string> = {
  Active: '#22c55e',
  Expired: '#f97316',
  Cancelled: '#ef4444',
}

export function ReportsPage() {
  const reportContentRef = useRef<HTMLDivElement | null>(null)
  const { preview, previewType, error, setPreview, previewReport, downloadReport } = useReports()
  const { data: dash, isLoading: dashLoading } = useDashboard()
  const [summary, setSummary] = useState<SubscriptionSummary>({ total: 0, active: 0, trial: 0, expired: 0, cancelled: 0 })
  const [dismissedError, setDismissedError] = useState(false)
  const [previewLoadingType, setPreviewLoadingType] = useState<ReportType | null>(null)
  const [downloadLoadingType, setDownloadLoadingType] = useState<ReportType | null>(null)
  const [lastDownloadParams, setLastDownloadParams] = useState<ReportDownloadParams | null>(null)
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 1)
    return date.toISOString().slice(0, 10)
  })
  const [filterEndDate, setFilterEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const message = dismissedError ? '' : error

  useEffect(() => {
    subscriptionApi.getSummary().then(setSummary).catch(() => undefined)
  }, [])

  const subBreakdown = [
    { label: 'Active', count: summary.active },
    { label: 'Expired', count: summary.expired },
    { label: 'Cancelled', count: summary.cancelled },
  ]

  async function handlePreview(params: ReportPreviewParams) {
    setPreviewLoadingType(params.type)
    try {
      await previewReport(params)
      setLastDownloadParams((current) => current ? { ...current, ...params } : null)
    } finally {
      setPreviewLoadingType(null)
    }
  }

  async function handleDownload(type: ReportType, params: ReportDownloadParams) {
    setDownloadLoadingType(type)
    try {
      await downloadReport(type, params)
      setLastDownloadParams(params)
    } finally {
      setDownloadLoadingType(null)
    }
  }

  async function downloadCurrentPreview() {
    if (!preview) return
    const params = lastDownloadParams ?? { type: preview.type, startDate: preview.startDate, endDate: preview.endDate, format: 'pdf' as const }
    await handleDownload(preview.type, params)
  }

  async function applyTopFilter() {
    await handlePreview({
      type: 'revenue',
      startDate: filterStartDate,
      endDate: filterEndDate,
    })
  }

  async function downloadTopPdf() {
    await handleDownload('revenue', {
      type: 'revenue',
      startDate: filterStartDate,
      endDate: filterEndDate,
      format: 'pdf',
    })
  }

  function printPage() {
    try {
      printReportElement(reportContentRef.current, {
        title: 'Platform Reports',
        subtitle: `Period: ${filterStartDate} to ${filterEndDate}`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open the print preview')
    }
  }

  return (
    <div ref={reportContentRef} className="space-y-8">
      <ErrorBanner message={message} onDismiss={() => setDismissedError(true)} />

      <section data-print-hide="true" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="mt-1 text-sm text-slate-400">Platform analytics and downloadable reports</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm font-medium text-slate-500">From</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(event) => setFilterStartDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
          <span className="text-sm font-medium text-slate-500">To</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(event) => setFilterEndDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
          <button
            type="button"
            onClick={() => void applyTopFilter()}
            disabled={previewLoadingType === 'revenue'}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={printPage}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => void downloadTopPdf()}
            disabled={downloadLoadingType === 'revenue'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </section>

      {/* ── Analytics ── */}
      <section className="space-y-6">
        <h3 className="text-base font-semibold text-slate-700">Analytics Overview</h3>

        {/* KPI row */}
        <div data-print-grid="4" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<BriefcaseBusiness className="h-6 w-6" />}
            iconBg="bg-blue-100"
            iconColor="text-blue-500"
            label="Total Companies"
            value={`${dash?.totalCompanies ?? 0}`}
            trend={dash ? `${dash.activeCompanies} active · ${dash.totalCompanies - dash.activeCompanies} inactive` : undefined}
            trendColor="text-slate-400"
            loading={dashLoading}
          />
          <KpiCard
            icon={<Users className="h-6 w-6" />}
            iconBg="bg-orange-100"
            iconColor="text-orange-500"
            label="Total Users"
            value={`${dash?.totalUsers ?? 0}`}
            trend={dash ? `${dash.totalUsers} platform-wide` : undefined}
            trendColor="text-slate-400"
            loading={dashLoading}
          />
          <KpiCard
            icon={<BarChart2 className="h-6 w-6" />}
            iconBg="bg-teal-100"
            iconColor="text-teal-500"
            label="Subscriptions"
            value={`${summary.total}`}
            trend={`${summary.active} active`}
            trendColor="text-teal-500"
            loading={dashLoading}
          />
          <KpiCard
            icon={<CreditCard className="h-6 w-6" />}
            iconBg="bg-purple-100"
            iconColor="text-purple-500"
            label="Total Revenue (Yearly)"
            value={`₱${(dash?.totalRevenue ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
            trend={dash ? `₱${dash.monthlyRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} this month` : undefined}
            trendColor="text-emerald-500"
            loading={dashLoading}
          />
        </div>

        {/* Charts row */}
        {!dashLoading && dash ? (
          <div data-print-grid="3" className="grid gap-6 xl:grid-cols-3">
            {/* Monthly Revenue Trend — bar chart */}
            <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
              <h4 className="text-base font-semibold text-slate-900">Monthly Revenue Trend</h4>
              <p className="mt-1 text-sm text-slate-400">Revenue per month</p>
              <ChartContainer className="mt-6 h-[280px] min-w-0">
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={dash.revenueByMonth} barCategoryGap="35%">
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}
                      formatter={(value) => [`₱${Number(value ?? 0).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ChartContainer>
            </div>

            {/* Subscription Distribution */}
            <SubscriptionDonutChart data={dash.subscriptionDistribution} />
          </div>
        ) : null}

        {/* Subscription Breakdown */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">Subscription Breakdown</h4>
          <div className="mt-5 space-y-4">
            {subBreakdown.map(({ label, count }) => {
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
              return (
                <div key={label} className="flex items-center gap-4">
                  <span className="w-20 shrink-0 text-sm text-slate-500">{label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: subBreakdownColors[label] ?? '#94a3b8' }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm font-semibold text-slate-700">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Report Generation ── */}
      <section data-print-hide="true" className="space-y-4">
        <h3 className="text-base font-semibold text-slate-700">Generate Reports</h3>
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportCard
            title="Revenue Report"
            description="Summary of all platform revenue"
            icon={<BarChart2 className="h-6 w-6 text-purple-500" />}
            iconBg="bg-purple-100"
          >
            <ReportFilterForm
              type="revenue"
              previewLoading={previewLoadingType === 'revenue'}
              downloadLoading={downloadLoadingType === 'revenue'}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          </ReportCard>

          <ReportCard
            title="Payment Report"
            description="All payment transactions in period"
            icon={<Receipt className="h-6 w-6 text-blue-500" />}
            iconBg="bg-blue-100"
          >
            <ReportFilterForm
              type="payments"
              allowStatus
              previewLoading={previewLoadingType === 'payments'}
              downloadLoading={downloadLoadingType === 'payments'}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />
          </ReportCard>
        </div>
      </section>

      {preview ? (
        <ReportPreviewPanel
          preview={preview}
          previewType={previewType}
          isDownloading={downloadLoadingType === preview.type}
          onClose={() => setPreview(null)}
          onDownload={downloadCurrentPreview}
        />
      ) : null}
    </div>
  )
}