import { useEffect, useRef, useState } from 'react'

type RecaptchaCheckboxProps = {
  resetKey: number
  onTokenChange: (token: string) => void
}

type RecaptchaRenderOptions = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  theme?: 'light' | 'dark'
}

type RecaptchaApi = {
  ready: (callback: () => void) => void
  render: (container: HTMLElement, options: RecaptchaRenderOptions) => number
  reset: (widgetId?: number) => void
}

declare global {
  interface Window {
    grecaptcha?: RecaptchaApi
  }
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-script'
const RECAPTCHA_SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit'

let recaptchaScriptPromise: Promise<void> | null = null

function loadRecaptchaScript() {
  if (typeof window === 'undefined' || window.grecaptcha) {
    return Promise.resolve()
  }

  if (recaptchaScriptPromise) {
    return recaptchaScriptPromise
  }

  recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    const handleLoad = () => resolve()
    const handleError = () => {
      recaptchaScriptPromise = null
      reject(new Error('Google reCAPTCHA could not be loaded.'))
    }

    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = RECAPTCHA_SCRIPT_ID
    script.src = RECAPTCHA_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return recaptchaScriptPromise
}

export function RecaptchaCheckbox({ resetKey, onTokenChange }: RecaptchaCheckboxProps) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? ''
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<number | null>(null)
  const onTokenChangeRef = useRef(onTokenChange)
  const [widgetError, setWidgetError] = useState<string | null>(null)

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange
  }, [onTokenChange])

  useEffect(() => {
    onTokenChangeRef.current('')
    if (!siteKey) {
      setWidgetError('Google reCAPTCHA site key is not configured.')
      return
    }

    let cancelled = false
    setWidgetError(null)

    async function renderWidget() {
      try {
        await loadRecaptchaScript()
        if (cancelled || !containerRef.current || !window.grecaptcha) {
          return
        }

        await new Promise<void>((resolve) => {
          window.grecaptcha?.ready(() => resolve())
        })

        if (cancelled || !containerRef.current || !window.grecaptcha) {
          return
        }

        if (widgetIdRef.current === null) {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onTokenChangeRef.current(token)
              setWidgetError(null)
            },
            'expired-callback': () => {
              onTokenChangeRef.current('')
              setWidgetError('reCAPTCHA expired. Please verify again.')
            },
            'error-callback': () => {
              onTokenChangeRef.current('')
              setWidgetError('reCAPTCHA could not be verified. Please reload and try again.')
            },
            theme: 'light',
          })
        } else {
          window.grecaptcha.reset(widgetIdRef.current)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        onTokenChangeRef.current('')
        setWidgetError(error instanceof Error ? error.message : 'Google reCAPTCHA could not be loaded.')
      }
    }

    void renderWidget()

    return () => {
      cancelled = true
    }
  }, [resetKey, siteKey])

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div ref={containerRef} className="min-h-[78px] min-w-[304px]" />
      </div>
      {widgetError ? <div className="text-xs font-medium text-rose-500">{widgetError}</div> : null}
    </div>
  )
}