import { Eye, EyeOff } from 'lucide-react'
import { useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { classNames } from '../../utils/classNames'
import { handleNumericInputKeyDown, handleNumericInputPaste, sanitizeNumericInputValue, type NumericInputMode } from '../../utils/numericInput'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  requiredField?: boolean
  leftIcon?: ReactNode
  showPasswordToggle?: boolean
  numericMode?: NumericInputMode
}

export function Input({
  label,
  error,
  hint,
  requiredField,
  className,
  type = 'text',
  leftIcon,
  showPasswordToggle,
  numericMode,
  onChange,
  onKeyDown,
  onPaste,
  inputMode,
  pattern,
  min,
  step,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const actualType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type
  const usesNumericFilter = actualType === 'number' || Boolean(numericMode)
  const resolvedNumericMode = numericMode ?? (String(step ?? '').includes('.') ? 'decimal' : 'integer')
  const minValue = typeof min === 'string' || typeof min === 'number' ? Number(min) : undefined
  const allowNegative = typeof minValue === 'number' && !Number.isNaN(minValue) ? minValue < 0 : false
  const numericInputOptions = usesNumericFilter
    ? { mode: resolvedNumericMode, allowNegative }
    : null

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)

    if (event.defaultPrevented || !numericInputOptions) {
      return
    }

    handleNumericInputKeyDown(event, numericInputOptions)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event)

    if (event.defaultPrevented || !numericInputOptions) {
      return
    }

    handleNumericInputPaste(event, numericInputOptions)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (numericInputOptions) {
      const sanitizedValue = sanitizeNumericInputValue(event.target.value, numericInputOptions)

      if (sanitizedValue !== event.target.value) {
        event.target.value = sanitizedValue
      }
    }

    onChange?.(event)
  }

  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          {label} {requiredField ? '*' : ''}
        </span>
      ) : null}

      <span
        className={classNames(
          'flex min-h-[3rem] items-center rounded-2xl border px-4 py-3 text-sm transition',
          error
            ? 'border-rose-300 bg-rose-50/70 text-rose-900 focus-within:border-rose-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-rose-100'
            : 'border-slate-200 bg-slate-50/70 text-slate-700 focus-within:border-sky-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100',
        )}
      >
        {leftIcon ? <span className={classNames('mr-2', error ? 'text-rose-400' : 'text-slate-400')}>{leftIcon}</span> : null}
        <input
          className={classNames(
            'w-full border-none bg-transparent text-slate-900 outline-none placeholder:text-slate-400',
            error ? 'placeholder:text-rose-300' : '',
            className,
          )}
          type={actualType}
          inputMode={usesNumericFilter ? (resolvedNumericMode === 'decimal' ? 'decimal' : 'numeric') : inputMode}
          pattern={usesNumericFilter ? (resolvedNumericMode === 'decimal' ? '[0-9]*[.]?[0-9]*' : '[0-9]*') : pattern}
          min={min}
          step={step}
          aria-invalid={Boolean(error)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          {...props}
        />
        {showPasswordToggle ? (
          <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-slate-400 transition hover:text-slate-700">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </span>

      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}
