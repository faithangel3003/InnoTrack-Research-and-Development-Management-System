export function maskEmail(email?: string | null) {
  if (!email) return '-'
  const [name, domain] = email.split('@')
  if (!domain) return email
  if (name.length <= 2) return `${name[0] || '*'}*@${domain}`
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`
}

export function truncate(value: string | undefined | null, max = 80) {
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max)}...`
}
