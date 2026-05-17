import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../../utils/classNames'
import { Spinner } from './Spinner'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variantMap = {
  primary: 'rounded-2xl bg-sky-900 text-white shadow-[0_10px_18px_rgba(12,74,110,0.18)] hover:bg-sky-800',
  secondary: 'rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
  ghost: 'rounded-2xl bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

const sizeMap = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
}

const spinnerColorMap = {
  primary: 'border-white',
  secondary: 'border-slate-400',
  danger: 'border-red-400',
  ghost: 'border-slate-400',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantMap[variant],
        sizeMap[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" color={spinnerColorMap[variant]} /> : leftIcon}
      <span>{children}</span>
      {!loading ? rightIcon : null}
    </button>
  )
}
