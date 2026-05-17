type SkeletonTableProps = {
  rows?: number
}

export function SkeletonTable({ rows = 5 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="grid grid-cols-6 gap-4 bg-slate-50 px-6 py-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-3 animate-pulse rounded bg-slate-200" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-4 px-6 py-4">
            {Array.from({ length: 6 }).map((__, colIndex) => (
              <div key={colIndex} className="h-4 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}