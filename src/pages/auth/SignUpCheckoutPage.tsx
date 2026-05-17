import { ArrowLeft, ArrowRight, CreditCard, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createPublicOnboardingCheckout, getLoginCaptchaChallenge, retryPublicOnboardingCheckout, type LoginCaptchaChallenge, type PublicOnboardingRequest } from '../../api/authApi'
import {
  authAccentIconClass,
  authGradientTextClass,
  authPrimaryButtonClass,
  authPrimaryTextClass,
} from '../../components/auth/authTheme'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/apiError'
import { classNames } from '../../utils/classNames'
import { formatPeso, getSignupPlan, loadSignupDraft, type SignupPlanId } from '../../utils/signupFlow'

type PaymentMethodId = 'paymongo'

type CheckoutLocationState = {
  registration?: {
    companyName: string
    industry: string
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    password: string
    planId: SignupPlanId
  }
}

const payMongoMethod: PaymentMethodId = 'paymongo'

export function SignUpCheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const draft = useMemo(() => loadSignupDraft(), [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaChallenge, setCaptchaChallenge] = useState<LoginCaptchaChallenge | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [captchaLoading, setCaptchaLoading] = useState(true)
  const registration = (location.state as CheckoutLocationState | null)?.registration
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const pendingOnboardingId = searchParams.get('pending')
  const paymentStatus = searchParams.get('paymentStatus')

  useEffect(() => {
    if (!draft || (!registration && !pendingOnboardingId)) {
      navigate('/signup', { replace: true })
    }
  }, [draft, navigate, pendingOnboardingId, registration])

  useEffect(() => {
    if (draft && (registration || pendingOnboardingId)) {
      void refreshCaptcha()
    }
  }, [draft, pendingOnboardingId, registration])

  useEffect(() => {
    if (paymentStatus === 'cancelled') {
      toast.error('PayMongo checkout was cancelled. Complete the captcha and try again.')
    }
  }, [paymentStatus, toast])

  if (!draft || (!registration && !pendingOnboardingId)) return null

  const activeRegistration = registration
  const plan = getSignupPlan(draft.planId)

  async function refreshCaptcha() {
    setCaptchaLoading(true)
    setCaptchaAnswer('')
    setCaptchaError(null)

    try {
      const nextChallenge = await getLoginCaptchaChallenge()
      setCaptchaChallenge(nextChallenge)
    } catch (error) {
      setCaptchaChallenge(null)
      setCaptchaError(error instanceof Error ? error.message : 'Captcha could not be loaded. Refresh and try again.')
    } finally {
      setCaptchaLoading(false)
    }
  }

  async function handleContinue() {
    if (!captchaChallenge) {
      setCaptchaError('Captcha is still loading. Please refresh and try again.')
      return
    }

    if (captchaAnswer.trim().length !== captchaChallenge.answerLength) {
      setCaptchaError(`Enter the ${captchaChallenge.answerLength}-digit captcha before finishing signup.`)
      return
    }

    setIsSubmitting(true)
    try {
      const checkout = pendingOnboardingId
        ? await retryPublicOnboardingCheckout(pendingOnboardingId, {
          paymentMethod: payMongoMethod,
          captchaToken: captchaAnswer,
          captchaChallengeId: captchaChallenge.challengeId,
        })
        : await createCheckoutSession(activeRegistration, payMongoMethod, captchaAnswer, captchaChallenge.challengeId)

      window.location.assign(checkout.checkoutUrl)
      return
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to start PayMongo checkout')
      await refreshCaptcha()
      if (/captcha/i.test(message)) {
        setCaptchaError(message)
      }
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createCheckoutSession(registrationState: CheckoutLocationState['registration'], paymentMethod: PaymentMethodId, captchaToken: string, captchaChallengeId: string) {
    if (!registrationState) {
      throw new Error('Signup details are missing. Return to signup and try again.')
    }

    const payload: PublicOnboardingRequest = {
      companyName: registrationState.companyName,
      industry: registrationState.industry,
      firstName: registrationState.firstName,
      lastName: registrationState.lastName,
      email: registrationState.email,
      phoneNumber: registrationState.phoneNumber,
      password: registrationState.password,
      planId: registrationState.planId,
      paymentMethod,
      captchaToken,
      captchaChallengeId,
    }

    return createPublicOnboardingCheckout(payload)
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/signup" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-500">Secure Checkout</div>
              <div className="text-xl font-black tracking-tight text-slate-900">Complete your company onboarding</div>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            Workspace admin: <span className="font-semibold text-slate-900">{draft.firstName} {draft.lastName}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
            <div className="text-3xl font-black tracking-[-0.03em] text-slate-900">InnoTrack ERP - {plan.name} Plan</div>
            <div className={classNames('mt-3 text-[3rem] font-black leading-none tracking-tight', authGradientTextClass)}>{formatPeso(plan.priceMonthly, 2)}</div>

            <div className="mt-8 space-y-5 border-t border-dashed border-slate-200 pt-6 text-slate-600">
              <div className="flex items-start justify-between gap-4 text-lg text-slate-800">
                <div>
                  <div className="font-semibold">{draft.companyName}</div>
                  <div className="mt-1 text-sm text-slate-500">{plan.name} monthly subscription</div>
                </div>
                <div className="font-black text-slate-900">{formatPeso(plan.priceMonthly, 2)}</div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryRow label="Admin email" value={draft.email} />
                  <SummaryRow label="Industry" value={draft.industry} />
                  <SummaryRow label="Users included" value={plan.seatsLabel} />
                  <SummaryRow label="Projects included" value={plan.projectsLabel} />
                </div>
              </div>

              <div className="space-y-3 border-t border-dashed border-slate-200 pt-5 text-base">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatPeso(plan.priceMonthly, 2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fees</span>
                  <span className={classNames('font-semibold', authPrimaryTextClass)}>Free</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-5 text-xl font-black text-slate-900">
                <span>Total Due</span>
                <span>{formatPeso(plan.priceMonthly, 2)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
            <div className="text-3xl font-black tracking-[-0.03em] text-slate-900">PayMongo checkout</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              InnoTrack now uses PayMongo as the secure payment gateway for signup. Continue to PayMongo to choose your preferred method (Card, GCash, GrabPay, or Maya) and complete payment.
            </p>

            <div className="mt-6 rounded-[22px] border border-sky-200 bg-sky-50/70 px-5 py-5">
              <div className="flex items-center gap-4">
                <div className={classNames('flex h-12 w-12 items-center justify-center rounded-2xl', authAccentIconClass)}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">PayMongo Hosted Checkout</div>
                  <div className="mt-1 text-sm text-slate-500">You will select and confirm your payment method on PayMongo.</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Card</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">GCash</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">GrabPay</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Maya</span>
              </div>
            </div>

            <Button
              type="button"
              className={classNames('mt-7 h-12 w-full rounded-2xl text-base', authPrimaryButtonClass)}
              disabled={isSubmitting || captchaLoading || !captchaChallenge || captchaAnswer.length !== (captchaChallenge?.answerLength ?? 4)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              loading={isSubmitting}
              onClick={handleContinue}
            >
              Continue to PayMongo
            </Button>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-500">
              <div className="font-semibold text-slate-700">Complete the quick captcha check before you submit signup.</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex h-16 w-full max-w-[190px] items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                  {captchaChallenge ? (
                    <img
                      src={captchaChallenge.imageDataUrl}
                      alt="Captcha code"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {captchaLoading ? 'Loading...' : 'Unavailable'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void refreshCaptcha()}
                  disabled={captchaLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={classNames('h-4 w-4', captchaLoading && 'animate-spin')} />
                  New code
                </button>
              </div>

              <div className="mt-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Enter the digits shown above
                  <span className="ml-1 text-rose-500">*</span>
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  value={captchaAnswer}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, '').slice(0, captchaChallenge?.answerLength ?? 4)
                    setCaptchaAnswer(nextValue)
                    setCaptchaError(null)
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Type the 4-digit code"
                  maxLength={captchaChallenge?.answerLength ?? 4}
                />
              </div>
              {captchaError ? <div className="mt-3 text-sm font-medium text-rose-500">{captchaError}</div> : null}
            </div>

            <div className="mt-6 text-center text-sm leading-6 text-slate-500">
              By continuing, you confirm the selected plan and continue to the hosted PayMongo payment page for {draft.companyName}.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  )
}