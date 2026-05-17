import { classNames } from '../../utils/classNames'

type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
  imageUrl?: string
}

function hashColor(name: string) {
  const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700', 'bg-emerald-100 text-emerald-700']
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function Avatar({ name, size = 'md', imageUrl }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

  const sizeMap = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={classNames('rounded-full object-cover', sizeMap[size])} />
  }

  return (
    <span className={classNames('inline-flex items-center justify-center rounded-full font-semibold', sizeMap[size], hashColor(name))}>
      {initials}
    </span>
  )
}
