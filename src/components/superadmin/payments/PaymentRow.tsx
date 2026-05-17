import { CreditCard, FileText, Landmark, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react'
import type { Payment, PaymentMethod } from '../../../types/superAdmin'
import { StatusBadge } from '../../ui/StatusBadge'

type PaymentRowProps = {
  payment: Payment
  onView: () => void
}

const methodIcons: Record<PaymentMethod, typeof CreditCard> = {
  Card: CreditCard,
  'Bank Transfer': Landmark,
  GCash: Smartphone,
  GrabPay: Wallet,
  Maya: ShieldCheck,
  PayMongo: Zap,
  Manual: FileText,
}

export function PaymentRow({ payment, onView }: PaymentRowProps) {
  const MethodIcon = methodIcons[payment.method] || CreditCard
  const amountClass = payment.status === 'Paid' ? 'text-emerald-600' : 'text-slate-700'

  return (
    <tr className="cursor-pointer border-b border-slate-50 text-sm text-slate-700 transition-colors hover:bg-slate-50" onClick={onView}>
      <td className="px-6 py-4">
        <div className="font-mono text-xs text-slate-500">#{payment.referenceNumber}</div>
      </td>
      <td className="px-6 py-4">
        <div className="font-semibold text-slate-900">{payment.companyName}</div>
        <div className="text-xs text-slate-400">{payment.companyEmail}</div>
      </td>
      <td className={`px-6 py-4 font-semibold ${amountClass}`}>₱{payment.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-slate-600">
          <MethodIcon className="h-4 w-4 text-slate-400" />
          {payment.method}
        </div>
      </td>
      <td className="px-6 py-4"><StatusBadge status={payment.status} /></td>
      <td className="px-6 py-4">
        {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(payment.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </td>
    </tr>
  )
}