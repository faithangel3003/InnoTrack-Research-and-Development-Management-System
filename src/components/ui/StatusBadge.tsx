type StatusBadgeProps = {
  status: string
}

const statusStyles: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trial: 'border-blue-200 bg-blue-50 text-blue-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-500',
  expired: 'border-red-200 bg-red-50 text-red-600',
  cancelled: 'border-orange-200 bg-orange-50 text-orange-600',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  failed: 'border-red-200 bg-red-50 text-red-600',
  refunded: 'border-purple-200 bg-purple-50 text-purple-600',
  starter: 'border-orange-200 bg-orange-50 text-orange-600',
  professional: 'border-blue-200 bg-blue-50 text-blue-600',
  enterprise: 'border-purple-200 bg-purple-50 text-purple-600',
}

function formatLabel(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase())
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.trim().toLowerCase()
  const classes = statusStyles[key] || 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {formatLabel(status)}
    </span>
  )
}