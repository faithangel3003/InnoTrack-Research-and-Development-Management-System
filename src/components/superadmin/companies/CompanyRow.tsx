import { Building2, CheckCircle2, PencilLine, Trash2, XCircle } from 'lucide-react'
import type { Company } from '../../../types/superAdmin'
import { StatusBadge } from '../../ui/StatusBadge'

type CompanyRowProps = {
  company: Company
  isActionLoading: boolean
  onView: (company: Company) => void
  onEdit: (company: Company) => void
  onActivate: (company: Company) => void
  onDeactivate: (company: Company) => void
  onDelete: (company: Company) => void
}

export function CompanyRow({ company, isActionLoading, onView, onEdit, onActivate, onDeactivate, onDelete }: CompanyRowProps) {
  return (
    <tr className="cursor-pointer border-b border-slate-50 text-sm text-slate-700 transition-colors hover:bg-slate-50" onClick={() => onView(company)}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{company.name}</div>
            <div className="text-xs text-slate-400">{company.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div>{company.contactName}</div>
        <div className="text-xs text-slate-400">{company.contactEmail}</div>
      </td>
      <td className="px-6 py-4"><StatusBadge status={company.status} /></td>
      <td className="px-6 py-4">
        <div><StatusBadge status={company.plan} /></div>
        {company.subscriptionStatus !== 'Active' ? <div className="mt-2"><StatusBadge status={company.subscriptionStatus} /></div> : null}
      </td>
      <td className="px-6 py-4 text-slate-500">{new Date(company.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Edit Company"
            onClick={() => onEdit(company)}
            disabled={isActionLoading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Activate"
            onClick={() => onActivate(company)}
            disabled={isActionLoading || company.status === 'Active'}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Deactivate"
            onClick={() => onDeactivate(company)}
            disabled={isActionLoading || company.status !== 'Active'}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete Company"
            onClick={() => onDelete(company)}
            disabled={isActionLoading}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}