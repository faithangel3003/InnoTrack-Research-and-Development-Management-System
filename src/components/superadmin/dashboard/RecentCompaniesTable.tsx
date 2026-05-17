import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { RecentCompany } from '../../../types/superAdmin'
import { StatusBadge } from '../../ui/StatusBadge'

type RecentCompaniesTableProps = {
  items: RecentCompany[]
}

export function RecentCompaniesTable({ items }: RecentCompaniesTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Recent Companies</h2>
        </div>
        <Link to="/admin/companies" className="text-sm text-slate-500 transition hover:text-slate-900">View all →</Link>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-sm text-slate-500">No companies registered yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.email}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-6 py-4 text-slate-700">{item.plan}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(item.registeredAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}