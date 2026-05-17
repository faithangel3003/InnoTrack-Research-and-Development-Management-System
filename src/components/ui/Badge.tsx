import { classNames } from '../../utils/classNames'

type BadgeProps = {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'
  size?: 'sm' | 'md'
  text: string
}

const variantMap = {
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-neutral-100 text-neutral-700',
}

const sizeMap = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({ variant = 'neutral', size = 'sm', text }: BadgeProps) {
  return (
    <span className={classNames('inline-flex rounded-full font-medium', variantMap[variant], sizeMap[size])}>
      {text}
    </span>
  )
}
