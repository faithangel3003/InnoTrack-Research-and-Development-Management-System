import { classNames } from '../../utils/classNames'
import { Badge } from '../ui/Badge'
import { normalizeRole, roleLabel } from '../../utils/roleHelpers'

type RoleBadgeProps = {
  role: string
  appearance?: 'pill' | 'text'
}

const textVariantMap = {
  SuperAdmin: 'text-sky-700',
  SystemAdmin: 'text-sky-700',
  ProjectManager: 'text-amber-700',
  TeamMember: 'text-slate-500',
} as const

export function RoleBadge({ role, appearance = 'pill' }: RoleBadgeProps) {
  const normalized = normalizeRole(role)

  if (appearance === 'text') {
    return <span className={classNames('text-sm font-semibold', textVariantMap[normalized as keyof typeof textVariantMap] || 'text-slate-500')}>{roleLabel(normalized)}</span>
  }

  if (normalized === 'SuperAdmin') {
    return <Badge variant="info" text={roleLabel(normalized)} />
  }

  if (normalized === 'SystemAdmin') {
    return <Badge variant="info" text={roleLabel(normalized)} />
  }

  if (normalized === 'ProjectManager') {
    return <Badge variant="warning" text={roleLabel(normalized)} />
  }

  return <Badge variant="neutral" text={roleLabel(normalized)} />
}
