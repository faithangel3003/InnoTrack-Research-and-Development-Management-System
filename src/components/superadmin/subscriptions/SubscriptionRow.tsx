import type { Subscription } from '../../../types/superAdmin'
import { StatusBadge } from '../../ui/StatusBadge'

type SubscriptionRowProps = {
  subscription: Subscription
  onView: (subscription: Subscription) => void
  onEdit: (subscription: Subscription) => void
}

export function SubscriptionRow({ subscription, onView, onEdit }: SubscriptionRowProps) {
  const isExpired = new Date(subscription.endDate) < new Date()

  return (
    <tr className="cursor-pointer border-b border-slate-50 text-sm text-slate-700 transition-colors hover:bg-slate-50" onClick={() => onView(subscription)}>
      <td className="px-6 py-4">
        <div className="font-semibold text-slate-900">{subscription.companyName}</div>
        <div className="text-xs text-slate-400">{subscription.companyEmail}</div>
      </td>
      <td className="px-6 py-4"><StatusBadge status={subscription.plan} /></td>
      <td className="px-6 py-4"><StatusBadge status={subscription.status} /></td>
      <td className={`px-6 py-4 text-xs ${isExpired ? 'font-semibold text-red-500' : 'text-slate-500'}`}>
        {new Date(subscription.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td className="px-6 py-4 text-slate-700">₱{subscription.amount.toLocaleString()} / {subscription.billingCycle === 'Monthly' ? 'month' : 'year'}</td>
      <td className="px-6 py-4 text-right">
        <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(subscription) }} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700">
          Edit
        </button>
      </td>
    </tr>
  )
}