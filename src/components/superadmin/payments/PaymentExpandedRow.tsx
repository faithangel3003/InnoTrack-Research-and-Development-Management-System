import type { Payment } from '../../../types/superAdmin'

type PaymentExpandedRowProps = {
  payment: Payment
}

export function PaymentExpandedRow({ payment }: PaymentExpandedRowProps) {
  return (
    <tr className="bg-slate-50">
      <td colSpan={6} className="px-6 py-4">
        <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Transaction Details</h4>
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <Detail label="Description" value={payment.description || 'No description provided'} />
            <Detail
              label="Billing Period"
              value={payment.billingPeriodStart && payment.billingPeriodEnd
                ? `${new Date(payment.billingPeriodStart).toLocaleDateString()} to ${new Date(payment.billingPeriodEnd).toLocaleDateString()}`
                : 'Not available'}
            />
            <Detail label="Full Reference" value={payment.referenceNumber} />
            <Detail label="Gateway Response" value={payment.gatewayMessage || 'No gateway message'} />
          </div>
        </div>
      </td>
    </tr>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
    </div>
  )
}