export const ROLE_OPTIONS = [
  { value: 'SuperAdmin', label: 'Super Admin' },
  { value: 'SystemAdmin', label: 'Organization Admin' },
  { value: 'ProjectManager', label: 'Project Manager' },
  { value: 'TeamMember', label: 'Team Member' },
]

export function normalizeRole(value?: string) {
  if (!value) return 'TeamMember'
  if (value.includes('Super')) return 'SuperAdmin'
  if (value.includes('System')) return 'SystemAdmin'
  if (value.includes('Organization')) return 'SystemAdmin'
  if (value.includes('Project')) return 'ProjectManager'
  if (value.includes('Team')) return 'TeamMember'
  return value
}

export function roleLabel(value?: string) {
  const normalized = normalizeRole(value)
  const role = ROLE_OPTIONS.find((item) => item.value === normalized)
  return role?.label || value || 'Unknown'
}
