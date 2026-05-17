import type { ClipboardEvent, KeyboardEvent } from 'react'

export type NumericInputMode = 'integer' | 'decimal'

type NumericInputOptions = {
  mode: NumericInputMode
  allowNegative?: boolean
}

export function normalizeDigitOnlyValue(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

export function sanitizeNumericInputValue(value: string, options: NumericInputOptions) {
  if (!value) {
    return ''
  }

  if (options.mode === 'decimal') {
    const rawValue = value.replace(/[^\d.-]/g, '')
    const hasLeadingMinus = Boolean(options.allowNegative && rawValue.startsWith('-'))
    const unsignedValue = rawValue.replace(/-/g, '')
    const [wholePart = '', ...decimalParts] = unsignedValue.split('.')
    const decimalPart = decimalParts.join('')
    const prefix = hasLeadingMinus ? '-' : ''

    return `${prefix}${wholePart}${decimalParts.length > 0 ? `.${decimalPart}` : ''}`
  }

  const rawValue = value.replace(/[^\d-]/g, '')
  const hasLeadingMinus = Boolean(options.allowNegative && rawValue.startsWith('-'))
  const digits = rawValue.replace(/-/g, '')

  return `${hasLeadingMinus ? '-' : ''}${digits}`
}

function isAllowedNumericValue(value: string, options: NumericInputOptions) {
  return sanitizeNumericInputValue(value, options) === value
}

export function handleNumericInputKeyDown(event: KeyboardEvent<HTMLInputElement>, options: NumericInputOptions) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
    return
  }

  const selectionStart = event.currentTarget.selectionStart ?? event.currentTarget.value.length
  const selectionEnd = event.currentTarget.selectionEnd ?? event.currentTarget.value.length
  const nextValue = `${event.currentTarget.value.slice(0, selectionStart)}${event.key}${event.currentTarget.value.slice(selectionEnd)}`

  if (!isAllowedNumericValue(nextValue, options)) {
    event.preventDefault()
  }
}

export function handleNumericInputPaste(event: ClipboardEvent<HTMLInputElement>, options: NumericInputOptions) {
  if (event.defaultPrevented) {
    return
  }

  const pastedText = event.clipboardData.getData('text')
  const selectionStart = event.currentTarget.selectionStart ?? event.currentTarget.value.length
  const selectionEnd = event.currentTarget.selectionEnd ?? event.currentTarget.value.length
  const nextValue = `${event.currentTarget.value.slice(0, selectionStart)}${pastedText}${event.currentTarget.value.slice(selectionEnd)}`

  if (!isAllowedNumericValue(nextValue, options)) {
    event.preventDefault()
  }
}