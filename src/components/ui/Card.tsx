import type { ReactNode } from 'react'
import { classNames } from '../../utils/classNames'

type CardProps = {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  padding?: 'sm' | 'md' | 'lg'
  className?: string
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ title, subtitle, actions, children, padding = 'md', className }: CardProps) {
  return (
    <section className={classNames('rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]', paddingMap[padding], className)}>
      {(title || subtitle || actions) ? (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h3 className="text-lg font-semibold text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  )
}
