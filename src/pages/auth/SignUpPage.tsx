import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthShowcasePanel, type AuthShowcaseHighlight } from '../../components/auth/AuthShowcasePanel'
import {
  authAccentSurfaceClass,
  authCompletionIconClass,
  authFieldFocusClass,
  authGradientTextClass,
  authLinkClass,
  authPrimaryButtonClass,
  authPrimaryTextClass,
  authProgressActiveClass,
  authProgressCompleteClass,
  authSelectedControlClass,
  authSelectedSurfaceClass,
} from '../../components/auth/authTheme'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { classNames } from '../../utils/classNames'
import { getSignupPlan, industryOptions, loadSignupDraft, saveSignupDraft, signupPlans, type SignupDraft, type SignupPlanId } from '../../utils/signupFlow'
import { handleNumericInputKeyDown, handleNumericInputPaste, normalizeDigitOnlyValue } from '../../utils/numericInput'

const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  industry: z.string().min(1, 'Select an industry'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phoneNumber: z.string().trim().optional().refine((value) => !value || /^\d{7,20}$/.test(value), 'Enter a valid phone number'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Include at least one lowercase character')
    .regex(/[A-Z]/, 'Include at least one uppercase character')
    .regex(/\d/, 'Include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Include at least one special character'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

type SignupFormValues = z.infer<typeof signupSchema>

const detailFields: Array<keyof SignupFormValues> = [
  'companyName',
  'industry',
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'password',
  'confirmPassword',
]

const setupHighlights: AuthShowcaseHighlight[] = [
  {
    title: 'Fast workspace launch',
    description: 'Prepare your research workspace, user access, and plan selection in a single guided flow.',
    icon: Sparkles,
  },
  {
    title: 'Built for collaboration',
    description: 'Bring project leads, researchers, and administrators into one structured environment.',
    icon: Users,
  },
  {
    title: 'Secure onboarding',
    description: 'Set password rules up front and keep your organization setup aligned with your chosen plan.',
    icon: ShieldCheck,
  },
]

export function SignUpPage() {
  const navigate = useNavigate()
  const initialDraft = useMemo(() => loadSignupDraft(), [])
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPlanId, setSelectedPlanId] = useState<SignupPlanId>(initialDraft?.planId ?? 'professional')
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)

  const {
    register,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: {
      companyName: initialDraft?.companyName ?? '',
      industry: initialDraft?.industry ?? '',
      firstName: initialDraft?.firstName ?? '',
      lastName: initialDraft?.lastName ?? '',
      email: initialDraft?.email ?? '',
      phoneNumber: normalizeDigitOnlyValue(initialDraft?.phoneNumber ?? ''),
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = watch('password', '')
  const selectedPlan = getSignupPlan(selectedPlanId)
  const phoneNumberField = register('phoneNumber', {
    onChange: (event) => {
      event.target.value = normalizeDigitOnlyValue(event.target.value)
    },
  })

  const passwordChecks = [
    { label: 'At least 12 characters', valid: passwordValue.length >= 12 },
    { label: 'One lowercase letter', valid: /[a-z]/.test(passwordValue) },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(passwordValue) },
    { label: 'One number', valid: /\d/.test(passwordValue) },
    { label: 'One special character', valid: /[^A-Za-z0-9]/.test(passwordValue) },
  ]

  function persistDraft(values = getValues()) {
    const draft: SignupDraft = {
      companyName: values.companyName.trim(),
      industry: values.industry,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phoneNumber: normalizeDigitOnlyValue(values.phoneNumber),
      planId: selectedPlanId,
    }

    saveSignupDraft(draft)
  }

  async function handleDetailsNext() {
    const isValid = await trigger(detailFields)
    if (!isValid) return

    persistDraft()
    setStep(2)
  }

  async function handleOpenCheckout() {
    const isValid = await trigger(detailFields)
    if (!isValid) {
      setStep(1)
      return
    }

    persistDraft()
    setIsCheckoutModalOpen(true)
  }

  function handleProceedToCheckout() {
    persistDraft()
    setIsCheckoutModalOpen(false)
    const values = getValues()

    navigate('/signup/checkout', {
      state: {
        registration: {
          companyName: values.companyName.trim(),
          industry: values.industry,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phoneNumber: normalizeDigitOnlyValue(values.phoneNumber),
          password: values.password,
          planId: selectedPlanId,
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1500px] lg:grid lg:min-h-screen lg:grid-cols-[0.9fr_1fr]">
        <AuthShowcasePanel
          badge="Guided Signup"
          title="Launch your innovation workspace with clarity."
          description="Set up your organization, choose the right plan, and prepare your secure billing handoff in one onboarding flow designed for modern R&D teams."
          highlights={setupHighlights}
          footer={
            <>
              Already have an InnoTrack workspace?{' '}
              <Link className="font-semibold text-white underline decoration-sky-200/45 underline-offset-4" to="/login">
                Sign in here
              </Link>
            </>
          }
        />

        <main className="px-4 py-8 sm:px-8 lg:px-16 lg:py-10">
          <div className="mx-auto max-w-[680px]">
            <div className="mb-8 flex items-center gap-3 text-sm font-semibold text-slate-400">
              {['Details', 'Plan', 'Done'].map((label, index) => {
                const stepNumber = index + 1
                const isActive = stepNumber === step
                const isComplete = stepNumber < step

                return (
                  <div key={label} className="flex flex-1 items-center gap-3 last:flex-none">
                    <div
                      className={classNames(
                        'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition',
                        isActive && authProgressActiveClass,
                        isComplete && authProgressCompleteClass,
                        !isActive && !isComplete && 'border-slate-200 bg-white text-slate-400',
                      )}
                    >
                      {stepNumber}
                    </div>
                    <span className={classNames(isActive || isComplete ? authPrimaryTextClass : 'text-slate-400')}>{label}</span>
                    {stepNumber < 3 ? <div className={classNames('h-[2px] flex-1 rounded-full', isComplete ? 'bg-sky-300' : 'bg-slate-200')} /> : null}
                  </div>
                )
              })}
            </div>

            <section className="rounded-[32px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
              {step === 1 ? (
                <>
                  <header className="text-center">
                    <div className="text-3xl font-black tracking-[-0.03em] text-slate-900">Create your company workspace</div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Enter your organization and admin details. Your plan can be selected in the next step.
                    </p>
                  </header>

                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel label="Company Name" required />
                      <input
                        className={fieldClass(Boolean(errors.companyName))}
                        placeholder="e.g. Acme Innovation Lab"
                        {...register('companyName')}
                      />
                      <FieldError message={errors.companyName?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Industry" required />
                      <div className="relative">
                        <select className={fieldClass(Boolean(errors.industry), true)} defaultValue="" {...register('industry')}>
                          <option value="" disabled>Select industry</option>
                          {industryOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                      <FieldError message={errors.industry?.message} />
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                      Use your primary company admin details so the handoff email and billing summary stay aligned.
                    </div>

                    <div>
                      <FieldLabel label="First Name" required />
                      <input className={fieldClass(Boolean(errors.firstName))} placeholder="First name" {...register('firstName')} />
                      <FieldError message={errors.firstName?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Last Name" required />
                      <input className={fieldClass(Boolean(errors.lastName))} placeholder="Last name" {...register('lastName')} />
                      <FieldError message={errors.lastName?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Email" required />
                      <input className={fieldClass(Boolean(errors.email))} placeholder="you@example.com" {...register('email')} />
                      <FieldError message={errors.email?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Phone Number" />
                      <input
                        className={fieldClass(Boolean(errors.phoneNumber))}
                        placeholder="09123456789"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...phoneNumberField}
                        onKeyDown={(event) => handleNumericInputKeyDown(event, { mode: 'integer' })}
                        onPaste={(event) => handleNumericInputPaste(event, { mode: 'integer' })}
                      />
                      <FieldError message={errors.phoneNumber?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Password" required />
                      <input className={fieldClass(Boolean(errors.password))} placeholder="Min 12 characters" type="password" {...register('password')} />
                      <FieldError message={errors.password?.message} />
                    </div>

                    <div>
                      <FieldLabel label="Confirm Password" required />
                      <input className={fieldClass(Boolean(errors.confirmPassword))} placeholder="Re-enter password" type="password" {...register('confirmPassword')} />
                      <FieldError message={errors.confirmPassword?.message} />
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-4">
                    <div className="text-sm font-semibold text-slate-700">Password requirements</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {passwordChecks.map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5 text-sm text-slate-500">
                          <span className={classNames('h-2.5 w-2.5 rounded-full', item.valid ? 'bg-sky-500' : 'bg-slate-300')} />
                          <span className={item.valid ? 'text-slate-700' : undefined}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                      Already have an account?{' '}
                      <Link className={authLinkClass} to="/login">Sign in here</Link>
                    </div>
                    <Button
                      type="button"
                      className={classNames('h-12 rounded-2xl px-6', authPrimaryButtonClass)}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={handleDetailsNext}
                    >
                      Next: Choose Plan
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <header className="text-center">
                    <div className="text-3xl font-black tracking-[-0.03em] text-slate-900">Choose your launch plan</div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      All plans include the core InnoTrack modules. Pick the best fit for your current team size and volume.
                    </p>
                  </header>

                  <div className="mt-8 space-y-4">
                    {signupPlans.map((plan) => {
                      const isSelected = plan.id === selectedPlanId

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={classNames(
                            'w-full rounded-[26px] border px-5 py-5 text-left transition',
                            isSelected ? authSelectedSurfaceClass : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="text-2xl font-black tracking-tight text-slate-900">{plan.name}</div>
                                {plan.featured ? (
                                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                                    Recommended
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 flex items-end gap-2">
                                <span className={classNames('text-[2rem] font-black leading-none tracking-tight', authGradientTextClass)}>PHP {plan.priceMonthly.toLocaleString()}</span>
                                <span className="pb-1 text-sm text-slate-500">/ mo</span>
                              </div>
                              <div className="mt-2 text-sm text-slate-500">{plan.blurb}</div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{plan.seatsLabel}</div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{plan.projectsLabel}</div>
                              <div className={classNames('flex h-10 w-10 items-center justify-center rounded-full border', isSelected ? authSelectedControlClass : 'border-slate-300 text-transparent')}>
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className={classNames('mt-7 rounded-[24px] border px-5 py-4 text-sm', authAccentSurfaceClass)}>
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5" />
                      <div>
                        Your selected plan includes all collaboration modules and will be carried into the checkout preview.
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="secondary" className="h-12 rounded-2xl px-6" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      className={classNames('h-12 rounded-2xl px-6', authPrimaryButtonClass)}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={handleOpenCheckout}
                    >
                      Continue to Checkout
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Checkout preview ready"
        size="sm"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="h-11 rounded-2xl px-5" onClick={() => setIsCheckoutModalOpen(false)}>
              Stay here
            </Button>
            <Button type="button" className={classNames('h-11 rounded-2xl px-5', authPrimaryButtonClass)} onClick={handleProceedToCheckout}>
              Continue
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-slate-600">
          <div className={classNames('flex h-16 w-16 items-center justify-center rounded-full', authCompletionIconClass)}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p>
            We prepared the checkout handoff for <span className="font-semibold text-slate-900">{getValues('email') || initialDraft?.email || 'your admin email'}</span>.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Selected plan</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-base font-bold text-slate-900">{selectedPlan.name}</span>
              <span className={classNames('text-base font-black', authGradientTextClass)}>PHP {selectedPlan.priceMonthly.toLocaleString()}/mo</span>
            </div>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            This preview keeps the onboarding flow complete while your public registration and payment endpoints are wired.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <div className="mb-2 text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="mt-1.5 text-xs font-medium text-rose-500">{message}</div> : null
}

function fieldClass(hasError: boolean, isSelect = false) {
  return classNames(
    'w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400',
    authFieldFocusClass,
    isSelect && 'appearance-none pr-10',
    hasError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200',
  )
}