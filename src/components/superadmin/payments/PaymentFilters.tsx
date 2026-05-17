import { Search } from 'lucide-react'

type PaymentFiltersProps = {
  searchValue: string
  status: string
  method: string
  startDate?: string
  endDate?: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onMethodChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onClear: () => void
}

export function PaymentFilters({
  searchValue,
  status,
  method,
  startDate,
  endDate,
  onSearchChange,
  onStatusChange,
  onMethodChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: PaymentFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_180px_auto] xl:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Search</span>
          <span className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/20">
            <Search className="mr-2 h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search by company or ref#"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </span>
        </label>

        <SelectField label="Status" value={status} onChange={onStatusChange}>
          <option value="">All</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
          <option value="Refunded">Refunded</option>
        </SelectField>

        <SelectField label="Method" value={method} onChange={onMethodChange}>
          <option value="">All</option>
          <option value="Card">Card</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="GCash">GCash</option>
          <option value="PayMongo">PayMongo</option>
          <option value="Manual">Manual</option>
        </SelectField>

        <DateField label="From" value={startDate || ''} onChange={onStartDateChange} />
        <DateField label="To" value={endDate || ''} onChange={onEndDateChange} />

        <button type="button" onClick={onClear} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
          Clear All
        </button>
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input type="date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}