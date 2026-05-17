import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { classNames } from '../../utils/classNames'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  hint?: string
  requiredField?: boolean
  leftIcon?: ReactNode
}

export function Textarea({
  label,
  error,
  hint,
  requiredField,
  leftIcon,
  className,
  rows = 5,
  ...props
}: TextareaProps) {
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          {label} {requiredField ? '*' : ''}
        </span>
      ) : null}

      <span
        className={classNames(
          'flex items-start rounded-2xl border px-4 py-3 text-sm transition',
          error
            ? 'border-rose-300 bg-rose-50/70 text-rose-900 focus-within:border-rose-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-rose-100'
            : 'border-slate-200 bg-slate-50/70 text-slate-700 focus-within:border-sky-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100',
        )}
      >
        {leftIcon ? <span className={classNames('mr-2 mt-0.5', error ? 'text-rose-400' : 'text-slate-400')}>{leftIcon}</span> : null}
        <textarea
          rows={rows}
          className={classNames(
            'min-h-[7rem] w-full resize-y border-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400',
            error ? 'placeholder:text-rose-300' : '',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </span>

      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}