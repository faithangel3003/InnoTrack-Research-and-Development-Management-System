import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import type { Subscription } from '../../types/superAdmin'
import { useSubscriptions } from '../../hooks/useSubscriptions'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Pagination } from '../../components/ui/Pagination'
import { KpiCard } from '../../components/ui/KpiCard'
import { SubscriptionFilters } from '../../components/superadmin/subscriptions/SubscriptionFilters'
import { SubscriptionTable } from '../../components/superadmin/subscriptions/SubscriptionTable'
import { EditSubscriptionModal } from '../../components/superadmin/subscriptions/EditSubscriptionModal'
import { SubscriptionDetailModal } from '../../components/superadmin/subscriptions/SubscriptionDetailModal'

export function SubscriptionsPage() {
  const {
    subscriptions,
    summary,
    pagination,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    isLoading,
    isSaving,
    error,
    saveSubscription,
    clearFilters,
  } = useSubscriptions()

  const [dismissedError, setDismissedError] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const message = dismissedError ? '' : error

  const cards = useMemo(() => [
    {
      label: 'Total Subscriptions',
      value: `${summary.total}`,
      trend: '',
      icon: <RefreshCw className="h-6 w-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Active Subscriptions',
      value: `${summary.active}`,
      trend: `${summary.trial} on trial`,
      trendColor: 'text-blue-500',
      icon: <CheckCircle2 className="h-6 w-6" />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Expired / Cancelled',
      value: `${summary.expired + summary.cancelled}`,
      trend: 'Needs attention',
      trendColor: 'text-red-500',
      icon: <AlertCircle className="h-6 w-6" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
    },
  ], [summary])

  return (
    <div className="space-y-6">
      <ErrorBanner message={message} onDismiss={() => setDismissedError(true)} />

      <section>
        <h2 className="text-2xl font-bold text-slate-900">Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-400">Manage all organization subscriptions</p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => <KpiCard key={card.label} {...card} />)}
      </section>

      <SubscriptionFilters
        searchValue={searchInput}
        status={filters.status}
        plan={filters.plan}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value }))}
        onPlanChange={(value) => setFilters((current) => ({ ...current, page: 1, plan: value }))}
        onClear={clearFilters}
      />

      <SubscriptionTable subscriptions={subscriptions} isLoading={isLoading} onView={setSelectedSubscription} onEdit={setEditingSubscription} />

      <Pagination
        currentPage={pagination.page}
        totalPages={totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />

      <SubscriptionDetailModal
        subscription={selectedSubscription}
        isOpen={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        onEdit={(subscription) => {
          setSelectedSubscription(null)
          setEditingSubscription(subscription)
        }}
      />

      <EditSubscriptionModal
        subscription={editingSubscription}
        isOpen={!!editingSubscription}
        isSaving={isSaving}
        onClose={() => setEditingSubscription(null)}
        onSave={saveSubscription}
      />
    </div>
  )
}