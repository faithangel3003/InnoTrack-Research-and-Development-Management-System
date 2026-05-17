import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, Check, ChevronDown, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  authAccentSurfaceClass,
  authFieldFocusClass,
  authGradientTextClass,
  authSelectedSurfaceClass,
} from '../../../components/auth/authTheme'
import type { BillingCycle, CompanyDetail, CompanyFormPayload, CompanyStatus, SubscriptionPlan, SubscriptionStatus } from '../../../types/superAdmin'
import { getErrorMessage } from '../../../utils/apiError'
import { classNames } from '../../../utils/classNames'
import { handleNumericInputKeyDown, handleNumericInputPaste, normalizeDigitOnlyValue } from '../../../utils/numericInput'
import { formatPeso, getSignupPlan, industryOptions, type SignupPlanId } from '../../../utils/signupFlow'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'

const companyStatusValues = ['Active', 'Inactive'] as const satisfies readonly CompanyStatus[]
const planValues = ['Starter', 'Professional', 'Enterprise'] as const satisfies readonly SubscriptionPlan[]
const subscriptionStatusValues = ['Active', 'Trial', 'Expired', 'Cancelled'] as const satisfies readonly SubscriptionStatus[]
const billingCycleValues = ['Monthly', 'Yearly'] as const satisfies readonly BillingCycle[]

const schema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required').max(255, 'Company name must be 255 characters or less'),
  industry: z.string().min(1, 'Select an industry'),
  firstName: z.string().trim().min(2, 'First name is required').max(100, 'First name must be 100 characters or less'),
  lastName: z.string().trim().min(2, 'Last name is required').max(100, 'Last name must be 100 characters or less'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  phoneNumber: z.string().trim().optional().refine((value) => !value || /^\d{7,20}$/.test(value), 'Enter a valid phone number'),
  companyStatus: z.enum(companyStatusValues),
  plan: z.enum(planValues),
  subscriptionStatus: z.enum(subscriptionStatusValues),
  billingCycle: z.enum(billingCycleValues),
})

export type CompanyFormValues = z.infer<typeof schema>

type CompanyFormModalProps = {
  mode: 'create' | 'edit'
  company: CompanyDetail | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: CompanyFormPayload) => Promise<void>
}

function toSignupPlanId(plan: SubscriptionPlan): SignupPlanId {
  return plan === 'Enterprise' ? 'enterprise' : plan === 'Professional' ? 'professional' : 'starter'
}

function defaultAmount(plan: SubscriptionPlan, billingCycle: BillingCycle) {
  const signupPlan = getSignupPlan(toSignupPlanId(plan))
  return billingCycle === 'Yearly' ? signupPlan.priceMonthly * 12 : signupPlan.priceMonthly
}

function splitContactName(contactName?: string | null) {
  const normalized = contactName?.trim() ?? ''

  if (!normalized) {
    return { firstName: '', lastName: '' }
  }

  const parts = normalized.split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function defaultValues(company: CompanyDetail | null): CompanyFormValues {
  const plan = company?.subscription?.plan ?? company?.plan ?? 'Professional'
  const { firstName, lastName } = splitContactName(company?.contactName)
  const subscriptionStatus = company?.subscription?.status
    ?? (company?.subscriptionStatus === 'Trial' || company?.subscriptionStatus === 'Expired' || company?.subscriptionStatus === 'Cancelled' || company?.subscriptionStatus === 'Active'
      ? company.subscriptionStatus
      : 'Active')

  return {
    companyName: company?.name ?? '',
    industry: company?.industry ?? '',
    firstName,
    lastName,
    email: company?.email ?? '',
    password: '',
    confirmPassword: '',
    phoneNumber: normalizeDigitOnlyValue(company?.phone ?? ''),
    companyStatus: company ? (company.status === 'Active' ? 'Active' : 'Inactive') : 'Active',
    plan,
    subscriptionStatus,
    billingCycle: company?.subscription?.billingCycle ?? 'Monthly',
  }
}

export function CompanyFormModal({ mode, company, isOpen, isSaving, onClose, onSubmit }: CompanyFormModalProps) {
  const [formError, setFormError] = useState('')
  const formId = useMemo(() => `company-form-${mode}`, [mode])

  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(company),
  })

  const selectedPlan = watch('plan')
  const selectedBillingCycle = watch('billingCycle')
  const selectedSignupPlan = useMemo(() => getSignupPlan(toSignupPlanId(selectedPlan)), [selectedPlan])
  const subscriptionAmount = useMemo(() => defaultAmount(selectedPlan, selectedBillingCycle), [selectedBillingCycle, selectedPlan])
  const phoneNumberField = register('phoneNumber', {
    onChange: (event) => {
      event.target.value = normalizeDigitOnlyValue(event.target.value)
    },
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset(defaultValues(company))
    setFormError('')
  }, [company, isOpen, reset])

  async function submit(values: CompanyFormValues) {
    try {
      setFormError('')

      if (mode === 'create') {
        clearErrors(['password', 'confirmPassword'])

        if (!values.password || values.password.length < 12) {
          setError('password', { message: 'Password must be at least 12 characters' })
          return
        }

        if (!values.confirmPassword) {
          setError('confirmPassword', { message: 'Confirm the password' })
          return
        }

        if (values.password !== values.confirmPassword) {
          setError('confirmPassword', { message: 'Passwords do not match' })
          return
        }
      }

      const contactName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim()
      await onSubmit({
        name: values.companyName.trim(),
        email: values.email.trim(),
        password: mode === 'create' ? values.password : undefined,
        phone: normalizeDigitOnlyValue(values.phoneNumber),
        address: company?.address?.trim() ?? '',
        contactName,
        contactRole: company?.contactRole?.trim() || 'Organization Admin',
        industry: values.industry.trim(),
        plan: values.plan,
        subscriptionStatus: values.subscriptionStatus,
        billingCycle: values.billingCycle,
        amount: subscriptionAmount,
        isActive: values.companyStatus === 'Active',
      })
    } catch (error) {
      setFormError(getErrorMessage(error, `Failed to ${mode === 'create' ? 'create' : 'update'} company`))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title={mode === 'create' ? 'Create Company' : 'Edit Company'}
      size="xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {mode === 'create' ? 'Create Company' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit(submit)}>
        <header className="text-center">
          <div className="text-2xl font-black tracking-[-0.03em] text-slate-900 sm:text-3xl">
            {mode === 'create' ? 'Create your company workspace' : 'Update your company workspace'}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Use the same company and admin details shown during signup so the superadmin company flow stays consistent.
          </p>
          {mode === 'create' ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-600">
              Set the company admin password here so the workspace is listed and can be opened immediately after creation.
            </p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <select className={fieldClass(Boolean(errors.industry), true)} {...register('industry')}>
                <option value="">Select industry</option>
                {industryOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <FieldError message={errors.industry?.message} />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
            Use the same primary admin details from the signup flow so company records and onboarding stay aligned.
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

          {mode === 'create' ? (
            <>
              <div>
                <FieldLabel label="Admin Password" required />
                <input className={fieldClass(Boolean(errors.password))} type="password" placeholder="Create admin password" {...register('password')} />
                <FieldError message={errors.password?.message} />
              </div>

              <div>
                <FieldLabel label="Confirm Password" required />
                <input className={fieldClass(Boolean(errors.confirmPassword))} type="password" placeholder="Confirm admin password" {...register('confirmPassword')} />
                <FieldError message={errors.confirmPassword?.message} />
              </div>
            </>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            Subscription Setup
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {planValues.map((plan) => {
              const signupPlan = getSignupPlan(toSignupPlanId(plan))
              const isSelected = selectedPlan === plan

              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setValue('plan', plan, { shouldDirty: true, shouldValidate: true })}
                  className={classNames(
                    'w-full overflow-hidden rounded-[22px] border px-4 py-4 text-left transition',
                    isSelected ? authSelectedSurfaceClass : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xl font-black tracking-tight text-slate-900">{signupPlan.name}</div>
                          {signupPlan.featured ? (
                            <span className="mt-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                              Recommended
                            </span>
                          ) : null}
                        </div>
                        <div className={classNames(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
                          isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 text-transparent',
                        )}>
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-2 flex items-end gap-2">
                        <span className={classNames('text-[1.9rem] font-black leading-none tracking-tight', authGradientTextClass)}>{formatPeso(signupPlan.priceMonthly, 0)}</span>
                        <span className="pb-1 text-sm text-slate-500">/ mo</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-slate-500">{signupPlan.blurb}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{signupPlan.seatsLabel}</div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{signupPlan.projectsLabel}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <FieldError message={errors.plan?.message} />

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel label="Company Status" required />
              <div className="relative">
                <select className={fieldClass(Boolean(errors.companyStatus), true)} {...register('companyStatus')}>
                  {companyStatusValues.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.companyStatus?.message} />
            </div>

            <div>
              <FieldLabel label="Subscription Status" required />
              <div className="relative">
                <select className={fieldClass(Boolean(errors.subscriptionStatus), true)} {...register('subscriptionStatus')}>
                  {subscriptionStatusValues.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.subscriptionStatus?.message} />
            </div>

            <div>
              <FieldLabel label="Billing Cycle" required />
              <div className="relative">
                <select className={fieldClass(Boolean(errors.billingCycle), true)} {...register('billingCycle')}>
                  {billingCycleValues.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <FieldError message={errors.billingCycle?.message} />
            </div>
          </div>

          <div className={classNames('mt-4 rounded-[20px] border px-4 py-3 text-sm', authAccentSurfaceClass)}>
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5" />
              <div>
                Subscription amount follows the selected signup plan and billing cycle.
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Subscription Amount</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-base font-bold text-slate-900">{selectedSignupPlan.name} · {selectedBillingCycle}</span>
                <span className={classNames('text-lg font-black sm:text-xl', authGradientTextClass)}>
                  {formatPeso(subscriptionAmount, 0)}
                </span>
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                {selectedBillingCycle === 'Yearly' ? 'Calculated as 12 months of the selected signup plan.' : 'Calculated from the selected monthly signup plan price.'}
              </div>
            </div>
          </div>
        </div>

        {formError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}
      </form>
    </Modal>
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
    'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400',
    authFieldFocusClass,
    isSelect ? 'appearance-none pr-11' : '',
    hasError ? 'border-rose-300 bg-rose-50/70 text-rose-900 placeholder:text-rose-300' : 'border-slate-200',
  )
}