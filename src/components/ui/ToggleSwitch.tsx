import { classNames } from '../../utils/classNames'

type ToggleSwitchProps = {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

export function ToggleSwitch({ checked, onChange, disabled = false, className, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={classNames(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-sky-700 bg-gradient-to-r from-sky-900 to-sky-600 shadow-[0_10px_20px_rgba(14,116,144,0.22)]'
          : 'border-slate-200 bg-slate-200/90',
        className,
      )}
    >
      <span
        className={classNames(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition-transform duration-200',
          checked ? 'translate-x-[1.45rem]' : 'translate-x-[0.2rem]',
        )}
      />
    </button>
  )
}