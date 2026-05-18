import { useMemo, useState } from 'react'
import { AlertCircle, Clock, CreditCard, TrendingUp } from 'lucide-react'
import { usePayments } from '../../hooks/usePayments'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { KpiCard } from '../../components/ui/KpiCard'
import { Pagination } from '../../components/ui/Pagination'
import { PaymentFilters } from '../../components/superadmin/payments/PaymentFilters'
import { PaymentTable } from '../../components/superadmin/payments/PaymentTable'
import { PaymentDetailModal } from '../../components/superadmin/payments/PaymentDetailModal'
import type { Payment } from '../../types/superAdmin'

function formatRevenue(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PaymentsPage() {
  const {
    payments,
    summary,
    pagination,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    isLoading,
    error,
    clearFilters,
  } = usePayments()

  const [dismissedError, setDismissedError] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const message = dismissedError ? '' : error

  const cards = useMemo(() => [
    {
      label: 'Total Transactions',
      value: `${summary.total}`,
      icon: <CreditCard className="h-6 w-6" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Total Revenue',
      value: formatRevenue(summary.totalRevenue),
      icon: <TrendingUp className="h-6 w-6" />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Pending Payments',
      value: `${summary.pending}`,
      trend: 'Awaiting confirmation',
      trendColor: 'text-yellow-600',
      icon: <Clock className="h-6 w-6" />,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Failed Payments',
      value: `${summary.failed}`,
      trend: 'Requires attention',
      trendColor: 'text-red-500',
      icon: <AlertCircle className="h-6 w-6" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
    },
  ], [summary])

  return (
    <div className="space-y-6">
      <ErrorBanner message={message} onDismiss={() => setDismissedError(true)} />
        
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <KpiCard key={card.label} {...card} />)}
      </section>

      <PaymentFilters
        searchValue={searchInput}
        status={filters.status}
        method={filters.method}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value }))}
        onMethodChange={(value) => setFilters((current) => ({ ...current, page: 1, method: value }))}
        onStartDateChange={(value) => setFilters((current) => ({ ...current, page: 1, startDate: value || undefined }))}
        onEndDateChange={(value) => setFilters((current) => ({ ...current, page: 1, endDate: value || undefined }))}
        onClear={() => {
          clearFilters()
          setSelectedPayment(null)
        }}
      />

      <PaymentTable
        payments={payments}
        isLoading={isLoading}
        onView={setSelectedPayment}
      />

      <PaymentDetailModal
        payment={selectedPayment}
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />
    </div>
  )
}