import { format } from 'date-fns'
import type { Payment } from '../../../types/superAdmin'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { StatusBadge } from '../../ui/StatusBadge'

type PaymentDetailModalProps = {
  payment: Payment | null
  isOpen: boolean
  onClose: () => void
}

export function PaymentDetailModal({ payment, isOpen, onClose }: PaymentDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={payment ? `Payment #${payment.referenceNumber}` : 'Payment Details'}
      size="sm"
      footer={<Button type="button" variant="secondary" onClick={onClose}>Close</Button>}
    >
      {!payment ? (
        <p className="text-sm text-slate-500">Payment details are unavailable.</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">{payment.companyName}</p>
            <p className="mt-1 text-xs text-slate-400">{payment.companyEmail}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Amount" value={`₱${payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Detail label="Status" value={<StatusBadge status={payment.status} />} />
            <Detail label="Method" value={payment.method} />
            <Detail label="Date" value={format(new Date(payment.date), 'MMM d, yyyy h:mm a')} />
            <Detail label="Reference" value={payment.referenceNumber} />
            <Detail label="Billing Period" value={payment.billingPeriodStart && payment.billingPeriodEnd ? `${format(new Date(payment.billingPeriodStart), 'MMM d, yyyy')} to ${format(new Date(payment.billingPeriodEnd), 'MMM d, yyyy')}` : 'Not available'} />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <Detail label="Description" value={payment.description || 'No description provided'} />
            <div className="mt-4">
              <Detail label="Gateway Response" value={payment.gatewayMessage || 'No gateway message'} />
            </div>
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