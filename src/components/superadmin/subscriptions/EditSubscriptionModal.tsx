import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Subscription } from '../../../types/superAdmin'
import { Modal } from '../../ui/Modal'
import { Spinner } from '../../ui/Spinner'

const schema = z.object({
  plan: z.enum(['Starter', 'Professional', 'Enterprise']),
  status: z.enum(['Active', 'Trial', 'Expired', 'Cancelled']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  billingCycle: z.enum(['Monthly', 'Yearly']),
}).refine((value) => new Date(value.endDate) > new Date(value.startDate), {
  path: ['endDate'],
  message: 'End date must be after start date',
})

type EditSubscriptionModalProps = {
  subscription: Subscription | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (subscriptionId: string, payload: Omit<Subscription, 'id' | 'companyId' | 'companyName' | 'companyEmail'>) => Promise<unknown>
}

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export function EditSubscriptionModal({ subscription, isOpen, isSaving, onClose, onSave }: EditSubscriptionModalProps) {
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      plan: 'Starter',
      status: 'Active',
      startDate: '',
      endDate: '',
      billingCycle: 'Monthly',
    },
  })

  const selectedPlan = watch('plan')
  const selectedBillingCycle = watch('billingCycle')
  const automaticAmount = useMemo(() => resolveSubscriptionAmount(selectedPlan, selectedBillingCycle), [selectedBillingCycle, selectedPlan])

  useEffect(() => {
    if (!subscription) {
      return
    }

    reset({
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate.slice(0, 10),
      endDate: subscription.endDate.slice(0, 10),
      billingCycle: subscription.billingCycle,
    })
    setFormError('')
  }, [reset, subscription])

  async function submit(values: FormValues) {
    if (!subscription) {
      return
    }

    try {
      setFormError('')
      await onSave(subscription.id, { ...values, amount: automaticAmount })
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update subscription')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title="Edit Subscription"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            Cancel
          </button>
          <button type="submit" form="edit-subscription-form" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
            {isSaving ? <Spinner size="sm" color="border-white" /> : null}
            Save Changes
          </button>
        </div>
      }
    >
      {subscription ? <p className="mb-4 text-sm text-slate-400">{subscription.companyName}</p> : null}

      <form id="edit-subscription-form" className="space-y-4" onSubmit={handleSubmit(submit)}>
        <Field label="Plan" error={errors.plan?.message}>
          <select {...register('plan')} className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.plan ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`}>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </Field>

        <Field label="Status" error={errors.status?.message}>
          <select {...register('status')} className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.status ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`}>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start Date" error={errors.startDate?.message}>
            <input type="date" {...register('startDate')} className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.startDate ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`} />
          </Field>
          <Field label="End Date" error={errors.endDate?.message}>
            <input type="date" {...register('endDate')} className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.endDate ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Billing Cycle" error={errors.billingCycle?.message}>
            <select {...register('billingCycle')} className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.billingCycle ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`}>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Amount">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="mr-2 text-sm text-slate-400">₱</span>
              <span className="text-sm font-semibold text-slate-800">{automaticAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </Field>
        </div>

        {formError ? <p className="text-xs text-red-500">{formError}</p> : null}
      </form>
    </Modal>
  )
}

function resolveSubscriptionAmount(plan: FormValues['plan'], billingCycle: FormValues['billingCycle']) {
  const monthlyAmount = plan === 'Enterprise' ? 4999 : plan === 'Professional' ? 2499 : 999
  return billingCycle === 'Yearly' ? monthlyAmount * 12 : monthlyAmount
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
    </label>
  )
}