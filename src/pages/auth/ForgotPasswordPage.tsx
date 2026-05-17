import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, HelpCircle, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import * as authApi from '../../api/authApi'
import { AuthShowcasePanel, type AuthShowcaseHighlight } from '../../components/auth/AuthShowcasePanel'
import { authLinkClass, authPrimaryButtonClass } from '../../components/auth/authTheme'
import { BrandMark } from '../../components/ui/BrandMark'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../context/ToastContext'
import { classNames } from '../../utils/classNames'

const emailSchema = z.object({
  email: z.string().email('Please provide the email tied to your workspace account'),
})

const resetSchema = z.object({
  answer: z.string().optional(),
  otpCode: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmNewPassword: z.string().min(8, 'Please confirm your new password'),
}).refine((values) => values.newPassword === values.confirmNewPassword, {
  path: ['confirmNewPassword'],
  message: 'Passwords do not match',
})

type EmailValues = z.infer<typeof emailSchema>
type ResetValues = z.infer<typeof resetSchema>

const recoveryHighlights: AuthShowcaseHighlight[] = [
  {
    title: 'Recover access securely',
    description: 'Use your saved security question or a one-time email code to prove account ownership before creating a new password.',
    icon: ShieldCheck,
  },
  {
    title: 'Keep work moving',
    description: 'Restore access without waiting for manual admin intervention, even when no security question has been set yet.',
    icon: KeyRound,
  },
  {
    title: 'Return to your workspace fast',
    description: 'Set a fresh password and head straight back to projects, reporting, and collaboration.',
    icon: HelpCircle,
  },
]

export function ForgotPasswordPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [questionState, setQuestionState] = useState<authApi.ForgotPasswordQuestionResponse | null>(null)

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      answer: '',
      otpCode: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  async function handleEmailSubmit(values: EmailValues) {
    const toastId = toast.loading('Preparing account recovery...')
    try {
      const response = await authApi.getForgotPasswordQuestion(values.email)
      setQuestionState(response)
      resetForm.reset()
      toast.dismiss(toastId)
      if (response.recoveryMethod === 'SecurityQuestion') {
        toast.success('Security question loaded')
      } else {
        toast.success(`A recovery code was sent to ${response.deliveryHint ?? response.email}`)
      }
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Could not start account recovery')
    }
  }

  async function handleResetSubmit(values: ResetValues) {
    if (!questionState) {
      return
    }

    if (questionState.recoveryMethod === 'SecurityQuestion') {
      if (!values.answer?.trim()) {
        resetForm.setError('answer', { type: 'manual', message: 'Answer is required' })
        return
      }
    } else if (!values.otpCode?.trim() || values.otpCode.trim().length !== 6) {
      resetForm.setError('otpCode', { type: 'manual', message: 'Enter the 6-digit OTP sent to your email' })
      return
    }

    const toastId = toast.loading('Resetting your password...')
    try {
      await authApi.resetPasswordWithSecurityQuestion({
        email: questionState.email,
        answer: questionState.recoveryMethod === 'SecurityQuestion' ? values.answer?.trim() : undefined,
        otpCode: questionState.recoveryMethod === 'EmailOtp' ? values.otpCode?.trim() : undefined,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      })
      toast.dismiss(toastId)
      toast.success('Password reset successfully. You can sign in now.')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Could not reset password')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1500px] lg:grid lg:min-h-screen lg:grid-cols-[0.9fr_1fr]">
        <AuthShowcasePanel
          badge="Account Recovery"
          title="Recover access without leaving the workspace flow."
          description="Answer your saved security question or enter a one-time email code, set a fresh password, and return to InnoTrack with minimal friction."
          highlights={recoveryHighlights}
          footer={
            <>
              Remembered your password?{' '}
              <Link className="font-semibold text-white underline decoration-sky-200/45 underline-offset-4" to="/login">
                Back to sign in
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

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-amber-700">
                Forgot Password
              </div>

              <header className="mt-6">
                <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-900">Recover your account</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Start with your workspace email. If a security question is configured, you can answer it here. Otherwise, we will send a one-time code to your email so you can continue securely.
                </p>
              </header>

              {!questionState ? (
                <form className="mt-8 space-y-5" onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
                  <Input
                    label="Workspace Email"
                    requiredField
                    placeholder="faithangelrasonable@gmail.com"
                    error={emailForm.formState.errors.email?.message}
                    {...emailForm.register('email')}
                  />

                  <Button
                    type="submit"
                    className={classNames('h-12 w-full rounded-2xl text-base', authPrimaryButtonClass)}
                    loading={emailForm.formState.isSubmitting}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Continue
                  </Button>
                </form>
              ) : (
                <form className="mt-8 space-y-5" onSubmit={resetForm.handleSubmit(handleResetSubmit)}>
                  {questionState.recoveryMethod === 'SecurityQuestion' ? (
                    <>
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/75 px-5 py-4 text-sm text-slate-600">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recovery question</p>
                        <p className="mt-3 text-xl font-semibold text-slate-900">{questionState.question}</p>
                        <p className="mt-2 text-sm text-slate-500">Answer matching is case-insensitive.</p>
                      </div>

                      <Input
                        label="Your Answer"
                        requiredField
                        placeholder="Enter your answer"
                        error={resetForm.formState.errors.answer?.message}
                        {...resetForm.register('answer')}
                      />
                    </>
                  ) : (
                    <>
                      <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-800">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Recovery code sent</p>
                        <p className="mt-3 text-base font-semibold text-emerald-950">
                          We sent a 6-digit OTP to {questionState.deliveryHint ?? questionState.email}.
                        </p>
                        <p className="mt-2 text-sm text-emerald-700">
                          Enter that code below, then choose a new password.
                        </p>
                      </div>

                      <Input
                        label="Email OTP"
                        requiredField
                        placeholder="Enter the 6-digit code"
                        error={resetForm.formState.errors.otpCode?.message}
                        {...resetForm.register('otpCode')}
                      />
                    </>
                  )}

                  <Input
                    label="New Password"
                    requiredField
                    placeholder="Create a new password"
                    showPasswordToggle
                    error={resetForm.formState.errors.newPassword?.message}
                    {...resetForm.register('newPassword')}
                  />

                  <Input
                    label="Confirm New Password"
                    requiredField
                    placeholder="Confirm your new password"
                    showPasswordToggle
                    error={resetForm.formState.errors.confirmNewPassword?.message}
                    {...resetForm.register('confirmNewPassword')}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 flex-1 rounded-2xl"
                      onClick={() => setQuestionState(null)}
                      leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                      Use another email
                    </Button>
                    <Button
                      type="submit"
                      className={classNames('h-12 flex-1 rounded-2xl text-base', authPrimaryButtonClass)}
                      loading={resetForm.formState.isSubmitting}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Reset Password
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
                <Link className={authLinkClass} to="/login">
                  Back to sign in
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}