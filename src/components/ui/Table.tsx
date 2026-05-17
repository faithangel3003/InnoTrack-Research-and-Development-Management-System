import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState'

type Column<T> = {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
}

type TableProps<T> = {
  columns: Array<Column<T>>
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function Table<T>({ columns, data, loading, emptyMessage = 'No data found', onRowClick }: TableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return <EmptyState title="No results" message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="sticky top-0 bg-white">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {data.map((row, index) => (
            <tr
              key={index}
              className="hover:bg-neutral-50"
              onClick={() => onRowClick?.(row)}
              role={onRowClick ? 'button' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-neutral-600">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
