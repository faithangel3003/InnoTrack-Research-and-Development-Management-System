import type { SelectHTMLAttributes } from 'react'
import { classNames } from '../../utils/classNames'

type Option = { value: string | number; label: string }

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  options: Option[]
  error?: string
  hint?: string
  requiredField?: boolean
}

export function Select({ label, options, error, hint, requiredField, className, ...props }: SelectProps) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          {label} {requiredField ? '*' : ''}
        </span>
      ) : null}

      <select
        className={classNames(
          'min-h-[3rem] w-full rounded-2xl border px-4 py-3 text-sm transition focus:outline-none',
          error
            ? 'border-rose-300 bg-rose-50/70 text-rose-900 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100'
            : 'border-slate-200 bg-slate-50/70 text-slate-700 focus:border-sky-200 focus:bg-white focus:ring-4 focus:ring-sky-100',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}
