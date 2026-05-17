import { Search } from 'lucide-react'

type SubscriptionFiltersProps = {
  searchValue: string
  status: string
  plan: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPlanChange: (value: string) => void
  onClear: () => void
}

export function SubscriptionFilters({ searchValue, status, plan, onSearchChange, onStatusChange, onPlanChange, onClear }: SubscriptionFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto] xl:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Search</span>
          <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/20">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search by company..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20" value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Plan</span>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20" value={plan} onChange={(event) => onPlanChange(event.target.value)}>
            <option value="">All</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </label>

        <button type="button" onClick={onClear} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
          Clear
        </button>
      </div>
    </div>
  )
}