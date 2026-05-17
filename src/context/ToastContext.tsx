import { CheckCircle2, CircleAlert } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast, { useToasterStore } from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

type ToastContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  loading: (message: string) => string
  dismiss: (id?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

type FeedbackModalState = {
  id: string
  kind: 'success' | 'error'
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts } = useToasterStore()
  const [activeModal, setActiveModal] = useState<FeedbackModalState | null>(null)
  const lastHandledToastId = useRef<string | null>(null)

  useEffect(() => {
    const nextToast = [...toasts]
      .filter((item) => (item.type === 'success' || item.type === 'error') && !item.dismissed)
      .sort((left, right) => right.createdAt - left.createdAt)[0]

    if (!nextToast || nextToast.id === lastHandledToastId.current) {
      return
    }

    const nextToastKind = nextToast.type === 'success' ? 'success' : 'error'

    lastHandledToastId.current = nextToast.id
    setActiveModal({
      id: nextToast.id,
      kind: nextToastKind,
      message: getToastMessage(nextToast.message, nextToastKind),
    })
  }, [toasts])

  useEffect(() => {
    if (!activeModal) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActiveModal((current) => (current?.id === activeModal.id ? null : current))
    }, activeModal.kind === 'success' ? 3200 : 5200)

    return () => window.clearTimeout(timeoutId)
  }, [activeModal])

  const contextValue = useMemo<ToastContextValue>(() => ({
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    loading: (message: string) => toast.loading(message),
    dismiss: (id?: string) => toast.dismiss(id),
  }), [])

  return (
    <ToastContext.Provider
      value={contextValue}
    >
      {children}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal?.kind === 'success' ? 'Success' : 'Something went wrong'}
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button type="button" onClick={() => setActiveModal(null)}>
              Close
            </Button>
          </div>
        }
      >
        {activeModal ? (
          <div className="flex items-start gap-3">
            <div
              className={activeModal.kind === 'success'
                ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600'}
            >
              {activeModal.kind === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeModal.kind === 'success' ? 'Action completed successfully.' : 'We could not finish that action.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeModal.message}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </ToastContext.Provider>
  )
}

function getToastMessage(message: unknown, kind: 'success' | 'error') {
  if (typeof message === 'string') {
    return message
  }

  if (typeof message === 'number') {
    return String(message)
  }

  return kind === 'success'
    ? 'The action completed successfully.'
    : 'An unexpected error occurred.'
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
