import { useMemo, useState } from 'react'
import { BriefcaseBusiness, CheckCircle2, DollarSign, Users } from 'lucide-react'
import { useDashboard } from '../../hooks/useDashboard'
import { useAuth } from '../../hooks/useAuth'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { KpiCard } from '../../components/ui/KpiCard'
import { SkeletonCard } from '../../components/ui/SkeletonCard'
import { RevenueTrendChart } from '../../components/superadmin/dashboard/RevenueTrendChart'
import { SubscriptionDonutChart } from '../../components/superadmin/dashboard/SubscriptionDonutChart'
import { RevenueStatsRow } from '../../components/superadmin/dashboard/RevenueStatsRow'
import { RecentCompaniesTable } from '../../components/superadmin/dashboard/RecentCompaniesTable'
import { RecentPaymentsTable } from '../../components/superadmin/dashboard/RecentPaymentsTable'

function formatCompactPeso(value: number) {
  if (Math.abs(value) >= 1000) {
    return `₱${(value / 1000).toFixed(1)}K`
  }

  return `₱${Math.round(value).toLocaleString()}`
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useDashboard()
  const [dismissedError, setDismissedError] = useState(false)

  const message = dismissedError ? '' : error
  const firstName = user?.firstName || 'Maria'

  const cards = useMemo(() => [
    {
      label: 'Total Companies',
      value: `${data?.totalCompanies ?? 0}`,
      trend: `+${data?.newCompaniesThisMonth ?? 0} this month`,
      trendColor: 'text-emerald-500',
      icon: <BriefcaseBusiness className="h-6 w-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Active Subscriptions',
      value: `${data?.activeSubscriptions ?? 0}`,
      trend: `${data?.trialSubscriptions ?? 0} active`,
      trendColor: 'text-teal-500',
      icon: <CheckCircle2 className="h-6 w-6" />,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-500',
    },
    {
      label: 'Total Users',
      value: `${data?.totalUsers ?? 0}`,
      trend: 'Platform-wide',
      trendColor: 'text-slate-400',
      icon: <Users className="h-6 w-6" />,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
    },
    {
      label: 'Monthly Revenue',
      value: formatCompactPeso(data?.monthlyRevenue ?? 0),
      trend: `${(data?.revenueGrowthPercent ?? 0) >= 0 ? '+' : ''}${(data?.revenueGrowthPercent ?? 0).toFixed(1)}% vs last month`,
      trendColor: (data?.revenueGrowthPercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500',
      icon: <DollarSign className="h-6 w-6" />,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-500',
    },
  ], [data])

  return (
    <div className="space-y-6">
      <ErrorBanner message={message} onDismiss={() => setDismissedError(true)} />

      <section>
        <h2 className="text-3xl font-bold text-slate-900">Welcome, {firstName} !</h2>
        <p className="mt-1 text-sm text-slate-400">Platform overview and company management</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} className="h-48 border border-slate-100 bg-white shadow-sm" />)
        ) : (
          cards.map((card) => <KpiCard key={card.label} {...card} />)
        )}
      </section>

      {isLoading ? (
        <section className="grid gap-6 xl:grid-cols-3">
          <SkeletonCard className="h-[430px] xl:col-span-2" />
          <SkeletonCard className="h-[430px]" />
        </section>
      ) : data ? (
        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <RevenueTrendChart data={data.revenueByMonth} />
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <RevenueStatsRow
                totalRevenue={data.totalRevenue}
                growth={data.revenueGrowthPercent}
                averagePerMonth={data.avgRevenuePerMonth}
              />
            </div>
          </div>
          <SubscriptionDonutChart data={data.subscriptionDistribution} />
        </section>
      ) : null}

      {isLoading ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <SkeletonCard className="h-[320px]" />
          <SkeletonCard className="h-[320px]" />
        </section>
      ) : data ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <RecentCompaniesTable items={data.recentCompanies} />
          <RecentPaymentsTable items={data.recentPayments} />
        </section>
      ) : null}
    </div>
  )
}