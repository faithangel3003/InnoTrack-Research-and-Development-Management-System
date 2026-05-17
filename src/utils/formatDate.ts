export function formatDate(input?: string | Date | null) {
  if (!input) return '-'
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export function relativeTime(input?: string | Date | null) {
  if (!input) return '-'
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return '-'

  const diff = date.getTime() - Date.now()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const minutes = Math.round(diff / (1000 * 60))
  const hours = Math.round(diff / (1000 * 60 * 60))
  const days = Math.round(diff / (1000 * 60 * 60 * 24))

  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}
