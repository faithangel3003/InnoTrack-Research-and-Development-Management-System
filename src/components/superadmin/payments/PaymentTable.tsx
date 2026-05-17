import { CreditCard } from 'lucide-react'
import type { Payment } from '../../../types/superAdmin'
import { EmptyState } from '../../ui/EmptyState'
import { SkeletonTable } from '../../ui/SkeletonTable'
import { PaymentRow } from './PaymentRow'

type PaymentTableProps = {
  payments: Payment[]
  isLoading: boolean
  onView: (payment: Payment) => void
}

export function PaymentTable({ payments, isLoading, onView }: PaymentTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={6} />
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="h-12 w-12 text-slate-300" />}
        title="No transactions found"
        message="Try adjusting your filters"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                onView={() => onView(payment)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}