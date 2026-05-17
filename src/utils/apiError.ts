import axios from 'axios'

function firstValidationMessage(errors: unknown) {
  if (!errors || typeof errors !== 'object') {
    return ''
  }

  const messages = Object.values(errors as Record<string, unknown>).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === 'string')
    }

    return typeof value === 'string' ? [value] : []
  })

  return messages[0] || ''
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData
    }

    if (responseData && typeof responseData === 'object') {
      const message = typeof responseData.message === 'string' ? responseData.message : ''
      const title = typeof responseData.title === 'string' ? responseData.title : ''
      const validationMessage = firstValidationMessage((responseData as { errors?: unknown }).errors)

      return validationMessage || message || title || fallback
    }
  }

  return error instanceof Error ? error.message : fallback
}