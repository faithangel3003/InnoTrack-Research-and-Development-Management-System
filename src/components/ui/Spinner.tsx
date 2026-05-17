import { classNames } from '../../utils/classNames'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function Spinner({ size = 'md', color = 'border-primary-500' }: SpinnerProps) {
  return (
    <span
      className={classNames(
        'inline-block animate-spin rounded-full border-t-transparent',
        sizeMap[size],
        color,
      )}
      aria-label="Loading"
    />
  )
}
