import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, Users, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { RecaptchaCheckbox } from '../../components/auth/RecaptchaCheckbox'
import { AuthShowcasePanel, type AuthShowcaseHighlight } from '../../components/auth/AuthShowcasePanel'
import { authFieldFocusClass, authLinkClass, authPrimaryButtonClass } from '../../components/auth/authTheme'
import { Button } from '../../components/ui/Button'
import { BrandMark } from '../../components/ui/BrandMark'
import { useAuth } from '../../hooks/useAuth'
import { classNames } from '../../utils/classNames'
import { useToast } from '../../context/ToastContext'

const schema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

const loginHighlights: AuthShowcaseHighlight[] = [
  {
    title: 'Continue active research work',
    description: 'Pick up projects, tasks, and reporting exactly where your team left off.',
    icon: Sparkles,
  },
  {
    title: 'Collaborate with your team',
    description: 'Access shared documents, assignments, and coordination tools from one workspace.',
    icon: Users,
  },
  {
    title: 'Secure workspace access',
    description: 'Use the same protected authentication surface as the rest of the onboarding experience.',
    icon: ShieldCheck,
  },
]

export function LoginPage() {
  const toast = useToast()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [recaptchaResetKey, setRecaptchaResetKey] = useState(0)
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  function handleRecaptchaTokenChange(token: string) {
    setRecaptchaToken(token)
    if (token) {
      setRecaptchaError(null)
    }
  }

  function resetRecaptcha(nextMessage?: string | null) {
    setRecaptchaToken('')
    setRecaptchaError(nextMessage ?? null)
    setRecaptchaResetKey((current) => current + 1)
  }

  async function onSubmit(values: FormValues) {
    if (!recaptchaToken) {
      setRecaptchaError('Please complete the reCAPTCHA checkbox before signing in.')
      return
    }

    const toastId = toast.loading('Signing you in...')
    try {
      await login(values.email, values.password, recaptchaToken)
      toast.dismiss(toastId)
      toast.success('Welcome back')
    } catch (error) {
      toast.dismiss(toastId)
      const message = error instanceof Error ? error.message : 'Login failed'
      resetRecaptcha(/recaptcha/i.test(message) ? message : 'Please complete the reCAPTCHA checkbox again before retrying.')
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1500px] lg:grid lg:min-h-screen lg:grid-cols-[0.9fr_1fr]">
        <AuthShowcasePanel
          badge="Secure Sign In"
          title="Return to your innovation workspace."
          description="Access your projects, tasks, collaboration spaces, and reporting tools through the same polished auth surface used across onboarding."
          highlights={loginHighlights}
          footer={
            <>
              Need a new workspace?{' '}
              <Link className="font-semibold text-white underline decoration-sky-200/45 underline-offset-4" to="/signup">
                Create one here
              </Link>
            </>
          }
        />

        <main className="px-4 py-8 sm:px-8 lg:px-16 lg:py-10">
          <div className="mx-auto flex max-w-[540px] items-center lg:min-h-full">
            <section className="w-full rounded-[32px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
              <BrandMark
                subtitle="Research & Development workspace"
                badgeClassName="h-12 w-12 rounded-2xl bg-slate-100 text-slate-900"
                fallbackClassName="text-xs text-slate-900"
                titleClassName="text-lg font-black tracking-[-0.02em] text-slate-900"
                subtitleClassName="text-[11px] uppercase tracking-[0.18em] text-slate-400"
              />

              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-sky-700">
                Welcome Back
              </div>

              <header className="mt-6">
                <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-900">Sign in to InnoTrack</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Use your workspace email and password to continue to your research and development dashboard.
                </p>
              </header>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <FieldLabel label="Email" required />
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={fieldClass(Boolean(errors.email), true)}
                      placeholder="admin@innotrack.com"
                      {...register('email')}
                    />
                  </div>
                  <FieldError message={errors.email?.message} />
                </div>

                <div>
                  <FieldLabel label="Password" required />
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={fieldClass(Boolean(errors.password), true)}
                      placeholder="Enter your password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError message={errors.password?.message} />
                  <div className="mt-2 flex justify-end">
                    <Link className={authLinkClass} to="/auth/forgot-password">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <div className="rounded-[24px] border border-sky-100 bg-sky-50/75 px-5 py-4 text-sm text-sky-700">
                  New to the platform? Start with the guided workspace signup, then return here after the superadmin approves your company.
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                  <RecaptchaCheckbox resetKey={recaptchaResetKey} onTokenChange={handleRecaptchaTokenChange} />
                  <FieldError message={recaptchaError ?? undefined} />
                </div>

                <Button
                  type="submit"
                  className={classNames('h-12 w-full rounded-2xl text-base', authPrimaryButtonClass)}
                  disabled={isSubmitting || !recaptchaToken}
                  loading={isSubmitting}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Sign In
                </Button>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
                Need a new workspace?{' '}
                <Link className={authLinkClass} to="/signup">
                  Create one here
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
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

function fieldClass(hasError: boolean, hasLeftIcon = false) {
  return classNames(
    'w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400',
    authFieldFocusClass,
    hasLeftIcon && 'pl-12',
    hasError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200',
  )
}
