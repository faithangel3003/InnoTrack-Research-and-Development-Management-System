import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, LayoutDashboard, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { completeOnboardingCheckout, type PublicOnboardingResponse } from '../../api/authApi'
import {
  authAccentIconClass,
  authCompletionIconClass,
  authLinkClass,
  authPrimaryButtonClass,
  authPrimaryTextClass,
  authProgressActiveClass,
} from '../../components/auth/authTheme'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/apiError'
import { classNames } from '../../utils/classNames'
import { clearSignupDraft, formatPeso, getSignupPlan, loadSignupDraft } from '../../utils/signupFlow'

export function SignUpCompletePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const draft = useMemo(() => loadSignupDraft(), [])
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const pendingOnboardingId = searchParams.get('pending')
  const [result, setResult] = useState<PublicOnboardingResponse | null>(null)
  const [isCompleting, setIsCompleting] = useState(Boolean(pendingOnboardingId))
  const [completionError, setCompletionError] = useState<string | null>(null)

  useEffect(() => {
    if (!draft && !pendingOnboardingId) {
      navigate('/signup', { replace: true })
    }
  }, [draft, navigate, pendingOnboardingId])

  useEffect(() => {
    let active = true

    async function finalizeOnboarding() {
      if (!pendingOnboardingId) {
        setIsCompleting(false)
        return
      }

      setIsCompleting(true)
      setCompletionError(null)

      try {
        const response = await completeOnboardingCheckout(pendingOnboardingId)
        if (!active) {
          return
        }

        setResult(response)
        clearSignupDraft()
        toastRef.current.success('PayMongo payment verified successfully')
      } catch (error) {
        if (!active) {
          return
        }

        const message = getErrorMessage(error, 'We could not verify your PayMongo payment yet.')
        setCompletionError(message)
        toastRef.current.error(message)
      } finally {
        if (active) {
          setIsCompleting(false)
        }
      }
    }

    void finalizeOnboarding()

    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOnboardingId])

  if (!draft && !pendingOnboardingId && !result) return null

  const resolvedPlanId = resolvePlanId(result?.plan ?? draft?.planId)
  const plan = getSignupPlan(resolvedPlanId)
  const companyName = result?.companyName ?? draft?.companyName ?? 'Your company'
  const adminEmail = result?.adminEmail ?? draft?.email ?? 'your admin email'
  const retryCheckoutUrl = pendingOnboardingId ? `/signup/checkout?pending=${encodeURIComponent(pendingOnboardingId)}` : '/signup/checkout'

  return (
    <div className="min-h-screen bg-[#f6f8fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[920px]">
        <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-slate-400">
          {['Details', 'Plan', 'Done'].map((label, index) => {
            const stepNumber = index + 1
            const isComplete = stepNumber <= 3

            return (
              <div key={label} className="flex flex-1 items-center gap-3 last:flex-none">
                <div className={classNames('flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold', authProgressActiveClass)}>
                  {stepNumber}
                </div>
                <span className={isComplete ? authPrimaryTextClass : 'text-slate-400'}>{label}</span>
                {stepNumber < 3 ? <div className="h-[2px] flex-1 rounded-full bg-sky-300" /> : null}
              </div>
            )
          })}
        </div>

        <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-10">
          {isCompleting ? (
            <>
              <div className={classNames('mx-auto flex h-20 w-20 items-center justify-center rounded-full', authCompletionIconClass)}>
                <LoaderCircle className="h-10 w-10 animate-spin" />
              </div>
              <div className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-sky-500">Verifying Payment</div>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-900">Checking your PayMongo payment status.</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
                InnoTrack is confirming the checkout session, then it will create your organization record, company admin account, subscription, and payment record automatically.
              </p>
            </>
          ) : completionError ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-rose-500">Payment Incomplete</div>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-900">We could not verify your PayMongo payment yet.</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">{completionError}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" variant="secondary" className="h-12 rounded-2xl px-6" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(retryCheckoutUrl)}>
                  Return to Checkout
                </Button>
                <Button type="button" className={classNames('h-12 rounded-2xl px-6', authPrimaryButtonClass)} rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => { clearSignupDraft(); navigate('/signup') }}>
                  Start Over
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={classNames('mx-auto flex h-20 w-20 items-center justify-center rounded-full', authCompletionIconClass)}>
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-sky-500">PayMongo Verified</div>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-900">Your company sign-up is complete.</h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
                InnoTrack verified your PayMongo payment and created your organization record, company admin account, subscription, and initial payment record. You can use the admin email below to continue into the workspace.
              </p>

              <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
                <SummaryCard label="Company" value={companyName} />
                <SummaryCard label="Admin Email" value={adminEmail} />
                <SummaryCard label="Selected Plan" value={`${plan.name} · ${formatPeso(plan.priceMonthly, 0)}/mo`} />
              </div>

              <div className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-5 text-left">
                <div className="flex items-center gap-3">
                  <div className={classNames('flex h-12 w-12 items-center justify-center rounded-2xl', authAccentIconClass)}>
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Next steps</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">Sign in with your company admin account.</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Use the admin email above to log in and continue setting up your workspace. The initial subscription payment has already been recorded through PayMongo.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" variant="secondary" className="h-12 rounded-2xl px-6" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => { clearSignupDraft(); navigate('/signup') }}>
                  Start Over
                </Button>
                <Link to="/login">
                  <Button type="button" className={classNames('h-12 rounded-2xl px-6', authPrimaryButtonClass)} rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Return to Login
                  </Button>
                </Link>
              </div>

              <div className="mt-6 text-sm text-slate-500">
                Ready to use the new workspace?{' '}
                <Link className={authLinkClass} to="/login">Sign in</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function resolvePlanId(plan: string | undefined) {
  switch ((plan || '').toLowerCase()) {
    case 'starter':
      return 'starter' as const
    case 'enterprise':
      return 'enterprise' as const
    default:
      return 'professional' as const
  }
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-base font-bold text-slate-900">{value}</div>
    </div>
  )
}