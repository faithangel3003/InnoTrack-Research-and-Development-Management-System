import { RefreshCw } from 'lucide-react'
import type { Subscription } from '../../../types/superAdmin'
import { EmptyState } from '../../ui/EmptyState'
import { SkeletonTable } from '../../ui/SkeletonTable'
import { SubscriptionRow } from './SubscriptionRow'

type SubscriptionTableProps = {
  subscriptions: Subscription[]
  isLoading: boolean
  onView: (subscription: Subscription) => void
  onEdit: (subscription: Subscription) => void
}

export function SubscriptionTable({ subscriptions, isLoading, onView, onEdit }: SubscriptionTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} />
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={<RefreshCw className="h-12 w-12 text-slate-300" />}
        title="No subscriptions found"
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
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Period</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Billing</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <SubscriptionRow key={subscription.id} subscription={subscription} onView={onView} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}