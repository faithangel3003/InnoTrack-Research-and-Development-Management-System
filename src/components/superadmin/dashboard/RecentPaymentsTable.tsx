import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { RecentPayment } from '../../../types/superAdmin'
import { StatusBadge } from '../../ui/StatusBadge'

type RecentPaymentsTableProps = {
  items: RecentPayment[]
}

export function RecentPaymentsTable({ items }: RecentPaymentsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recent Payments</h2>
        </div>
        <Link to="/admin/payments" className="text-sm text-slate-500 transition hover:text-slate-900">View all →</Link>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-500">No payments recorded yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.companyName}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₱{item.amount.toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(item.date), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}