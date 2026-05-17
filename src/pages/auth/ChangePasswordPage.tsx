import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { AuthShowcasePanel, type AuthShowcaseHighlight } from '../../components/auth/AuthShowcasePanel'
import { authFieldFocusClass, authPrimaryButtonClass } from '../../components/auth/authTheme'
import { Button } from '../../components/ui/Button'
import { classNames } from '../../utils/classNames'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'New password must be at least 12 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormValues = z.infer<typeof schema>

const passwordHighlights: AuthShowcaseHighlight[] = [
  {
    title: 'Temporary password detected',
    description: 'Your company admin account was provisioned by a superadmin and must be secured before normal access continues.',
    icon: KeyRound,
  },
  {
    title: 'One-time required step',
    description: 'You will be redirected into the workspace automatically after the password is replaced.',
    icon: ShieldCheck,
  },
]

export function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const toast = useToast()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: FormValues) {
    const toastId = toast.loading('Updating your password...')
    try {
      await changePassword(values.currentPassword, values.newPassword)
      toast.dismiss(toastId)
      toast.success('Password updated successfully')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="mx-auto max-w-[1500px] lg:grid lg:min-h-screen lg:grid-cols-[0.92fr_1fr]">
        <AuthShowcasePanel
          badge="Password Update Required"
          title="Secure your company admin account before continuing."
          description="This account was created by the superadmin with a temporary password. Replace it now to unlock the workspace."
          highlights={passwordHighlights}
          footer={
            <button
              type="button"
              className="font-semibold text-white underline decoration-sky-200/45 underline-offset-4"
              onClick={() => void logout()}
            >
              Sign out instead
            </button>
          }
        />

        <main className="px-4 py-8 sm:px-8 lg:px-16 lg:py-10">
          <div className="mx-auto flex max-w-[560px] items-center lg:min-h-full">
            <section className="w-full rounded-[32px] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-amber-700">
                First Login Step
              </div>

              <header className="mt-6">
                <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-900">Change your temporary password</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Signed in as <span className="font-semibold text-slate-800">{user?.email}</span>. Use the temporary password provided by the superadmin as your current password, then set a new one with at least 12 characters.
                </p>
              </header>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <PasswordField
                  label="Current Password"
                  placeholder="Enter temporary password"
                  error={errors.currentPassword?.message}
                  visible={showCurrentPassword}
                  onToggle={() => setShowCurrentPassword((current) => !current)}
                  registration={register('currentPassword')}
                />

                <PasswordField
                  label="New Password"
                  placeholder="Create a new password"
                  error={errors.newPassword?.message}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((current) => !current)}
                  registration={register('newPassword')}
                />

                <PasswordField
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  error={errors.confirmPassword?.message}
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((current) => !current)}
                  registration={register('confirmPassword')}
                />

                <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 px-5 py-4 text-sm text-amber-800">
                  You cannot access the rest of the app until this password is changed.
                </div>

                <Button
                  type="submit"
                  className={classNames('h-12 w-full rounded-2xl text-base', authPrimaryButtonClass)}
                  loading={isSubmitting}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Update Password
                </Button>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  placeholder,
  error,
  visible,
  onToggle,
  registration,
}: {
  label: string
  placeholder: string
  error?: string
  visible: boolean
  onToggle: () => void
  registration: UseFormRegisterReturn
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}<span className="ml-1 text-rose-500">*</span></div>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className={fieldClass(Boolean(error))}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <div className="mt-1.5 text-xs font-medium text-rose-500">{error}</div> : null}
    </div>
  )
}

function fieldClass(hasError: boolean) {
  return classNames(
    'w-full rounded-2xl border bg-white px-4 py-3.5 pl-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400',
    authFieldFocusClass,
    hasError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200',
  )
}