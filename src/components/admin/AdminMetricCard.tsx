import type { ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

type AdminMetricCardProps = {
  label: string
  value: string | number
  helper?: string
  icon: ReactNode
  tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate'
  className?: string
}

const toneMap = {
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
}

export function AdminMetricCard({ label, value, helper, icon, tone = 'sky', className }: AdminMetricCardProps) {
  return (
    <article className={classNames('rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)]', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
        </div>

        <div className={classNames('flex h-12 w-12 items-center justify-center rounded-2xl', toneMap[tone])}>
          {icon}
        </div>
      </div>
    </article>
  )
}