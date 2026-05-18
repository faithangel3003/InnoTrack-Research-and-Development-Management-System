let htmlDecoder: HTMLTextAreaElement | null = null

export function decodeHtmlEntities(value?: string | null) {
  if (!value) {
    return ''
  }

  if (typeof document === 'undefined') {
    return value
  }

  if (!htmlDecoder) {
    htmlDecoder = document.createElement('textarea')
  }

  htmlDecoder.innerHTML = value
  return htmlDecoder.value
}

export function truncateWords(input?: string | null, wordLimit = 5) {
  if (!input) return ''
  const decoded = decodeHtmlEntities(input)
  const words = decoded.split(/\s+/).filter(Boolean)
  if (words.length <= wordLimit) return decoded
  return words.slice(0, wordLimit).join(' ') + '...'
}
