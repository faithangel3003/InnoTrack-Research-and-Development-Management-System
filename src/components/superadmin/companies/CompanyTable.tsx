import type { Company } from '../../../types/superAdmin'
import { Building2 } from 'lucide-react'
import { EmptyState } from '../../ui/EmptyState'
import { SkeletonTable } from '../../ui/SkeletonTable'
import { CompanyRow } from './CompanyRow'

type CompanyTableProps = {
  companies: Company[]
  isLoading: boolean
  actionLoadingId: string
  onView: (company: Company) => void
  onEdit: (company: Company) => void
  onActivate: (company: Company) => void
  onDeactivate: (company: Company) => void
  onDelete: (company: Company) => void
}

export function CompanyTable({ companies, isLoading, actionLoadingId, onView, onEdit, onActivate, onDeactivate, onDelete }: CompanyTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} />
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="h-12 w-12 text-slate-300" />}
        title="No companies found"
        message="Try adjusting your search or filters"
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
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Subscription</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Registered</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <CompanyRow
                key={company.id}
                company={company}
                isActionLoading={actionLoadingId === company.id}
                onView={onView}
                onEdit={onEdit}
                onActivate={onActivate}
                onDeactivate={onDeactivate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}