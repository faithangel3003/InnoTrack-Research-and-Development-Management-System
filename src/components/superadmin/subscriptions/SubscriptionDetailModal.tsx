import { format } from 'date-fns'
import type { Subscription } from '../../../types/superAdmin'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { StatusBadge } from '../../ui/StatusBadge'

type SubscriptionDetailModalProps = {
  subscription: Subscription | null
  isOpen: boolean
  onClose: () => void
  onEdit: (subscription: Subscription) => void
}

export function SubscriptionDetailModal({ subscription, isOpen, onClose, onEdit }: SubscriptionDetailModalProps) {
  const footer = subscription ? (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      <Button type="button" onClick={() => onEdit(subscription)}>Edit</Button>
    </div>
  ) : undefined

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subscription?.companyName || 'Subscription Details'} size="sm" footer={footer}>
      {!subscription ? (
        <p className="text-sm text-slate-500">Subscription details are unavailable.</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">{subscription.companyName}</p>
            <p className="mt-1 text-xs text-slate-400">{subscription.companyEmail}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Plan" value={<StatusBadge status={subscription.plan} />} />
            <Detail label="Status" value={<StatusBadge status={subscription.status} />} />
            <Detail label="Start Date" value={format(new Date(subscription.startDate), 'MMM d, yyyy')} />
            <Detail label="End Date" value={format(new Date(subscription.endDate), 'MMM d, yyyy')} />
            <Detail label="Billing Cycle" value={subscription.billingCycle} />
            <Detail label="Amount" value={`₱${subscription.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          </div>
        </div>
      )}
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{value}</div>
    </div>
  )
}