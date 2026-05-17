import { AlertCircle, X } from 'lucide-react'

type ErrorBannerProps = {
  message?: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) {
    return null
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="text-red-500 transition hover:text-red-700" aria-label="Dismiss error">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}