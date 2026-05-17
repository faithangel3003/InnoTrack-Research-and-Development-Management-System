import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import type { CompanyDetail, Subscription } from '../../../types/superAdmin'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { StatusBadge } from '../../ui/StatusBadge'
import { Spinner } from '../../ui/Spinner'

type CompanyDetailModalProps = {
  company: CompanyDetail | null
  isOpen: boolean
  isLoading: boolean
  isActionLoading?: boolean
  isSubscriptionSaving?: boolean
  onClose: () => void
  onEdit: (company: CompanyDetail) => void
  onActivate: (company: CompanyDetail) => void
  onDelete: (company: CompanyDetail) => void
  onDeactivate: (company: CompanyDetail) => void
  onSaveSubscription: (subscriptionId: string, payload: Omit<Subscription, 'id' | 'companyId' | 'companyName' | 'companyEmail'>) => Promise<unknown>
}

const tabs = ['Overview', 'Subscription', 'Payments'] as const

export function CompanyDetailModal({
  company,
  isOpen,
  isLoading,
  isActionLoading = false,
  isSubscriptionSaving = false,
  onClose,
  onEdit,
  onActivate,
  onDelete,
  onDeactivate,
  onSaveSubscription,
}: CompanyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview')
  const [isEditingSubscriptionDates, setIsEditingSubscriptionDates] = useState(false)
  const [subscriptionDateDraft, setSubscriptionDateDraft] = useState({ startDate: '', endDate: '' })
  const [subscriptionError, setSubscriptionError] = useState('')
  const subscription = company?.subscription ?? null

  useEffect(() => {
    if (isOpen) {
      setActiveTab('Overview')
    }
  }, [isOpen, company?.id])

  useEffect(() => {
    if (!subscription) {
      setIsEditingSubscriptionDates(false)
      setSubscriptionDateDraft({ startDate: '', endDate: '' })
      setSubscriptionError('')
      return
    }

    setIsEditingSubscriptionDates(false)
    setSubscriptionDateDraft({
      startDate: subscription.startDate.slice(0, 10),
      endDate: subscription.endDate.slice(0, 10),
    })
    setSubscriptionError('')
  }, [subscription])

  const footer = useMemo(() => {
    if (!company) {
      return undefined
    }

    return (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isActionLoading}>
          Close
        </Button>
        <Button type="button" variant="secondary" onClick={() => onEdit(company)} disabled={isActionLoading}>
          Edit
        </Button>
        <Button type="button" variant="danger" onClick={() => onDelete(company)} disabled={isActionLoading}>
          Delete
        </Button>
        {company.status === 'Active' ? (
          <Button
            type="button"
            onClick={() => onDeactivate(company)}
            variant="danger"
            disabled={isActionLoading}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => onActivate(company)}
            disabled={isActionLoading}
          >
            Activate
          </Button>
        )}
      </div>
    )
  }, [company, isActionLoading, onActivate, onClose, onDeactivate, onDelete, onEdit])

  async function handleSaveSubscriptionDates() {
    if (!company?.subscription) {
      return
    }

    if (!subscriptionDateDraft.startDate || !subscriptionDateDraft.endDate) {
      setSubscriptionError('Start and end dates are required')
      return
    }

    if (new Date(subscriptionDateDraft.endDate).getTime() <= new Date(subscriptionDateDraft.startDate).getTime()) {
      setSubscriptionError('End date must be after start date')
      return
    }

    try {
      setSubscriptionError('')
      await onSaveSubscription(company.subscription.id, {
        plan: company.subscription.plan,
        status: company.subscription.status,
        startDate: subscriptionDateDraft.startDate,
        endDate: subscriptionDateDraft.endDate,
        billingCycle: company.subscription.billingCycle,
        amount: company.subscription.amount,
      })
      setIsEditingSubscriptionDates(false)
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to update subscription dates')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={company?.name || 'Company Details'} size="lg" footer={footer}>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="lg" color="border-slate-700" /></div>
      ) : !company ? (
        <p className="text-sm text-slate-500">Company details are unavailable.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
            <StatusBadge status={company.status} />
          </div>

          {company.status === 'Pending' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This company is pending activation. Use Activate to approve the organization and restore sign-in access for its users.
            </div>
          ) : null}

          <div className="flex gap-6 border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="Email" value={company.email} />
              <InfoItem label="Phone" value={company.phone || 'Not provided'} />
              <InfoItem label="Address" value={company.address || 'Not provided'} />
              <InfoItem label="Contact Person" value={company.contactName || 'Not provided'} />
              <InfoItem label="Contact Role" value={company.contactRole || 'Not provided'} />
              <InfoItem label="Registered" value={format(new Date(company.registeredAt), 'MMM d, yyyy')} />
              <InfoItem label="Last Active" value={company.lastActiveAt ? formatDistanceToNow(new Date(company.lastActiveAt), { addSuffix: true }) : 'No recorded activity'} />
              <InfoItem label="Industry" value={company.industry || 'Not provided'} />
            </div>
          ) : null}

          {activeTab === 'Subscription' ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              {company.subscription ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Subscription Window</p>
                      <p className="mt-2 text-sm text-slate-500">Adjust renewal timing directly from the company record.</p>
                    </div>
                    {isEditingSubscriptionDates ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => {
                          setIsEditingSubscriptionDates(false)
                          setSubscriptionDateDraft({
                            startDate: company.subscription?.startDate.slice(0, 10) ?? '',
                            endDate: company.subscription?.endDate.slice(0, 10) ?? '',
                          })
                          setSubscriptionError('')
                        }} disabled={isSubscriptionSaving}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={() => void handleSaveSubscriptionDates()} loading={isSubscriptionSaving}>
                          Save Dates
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="secondary" onClick={() => setIsEditingSubscriptionDates(true)}>
                        Edit Dates
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem label="Current Plan" value={company.subscription.plan} emphasize />
                    <InfoItem label="Status" value={company.subscription.status} emphasize />
                    {isEditingSubscriptionDates ? (
                      <Input
                        label="Start Date"
                        type="date"
                        value={subscriptionDateDraft.startDate}
                        onChange={(event) => setSubscriptionDateDraft((current) => ({ ...current, startDate: event.target.value }))}
                        error={subscriptionError && !subscriptionDateDraft.startDate ? 'Start date is required' : undefined}
                      />
                    ) : (
                      <InfoItem label="Start Date" value={format(new Date(company.subscription.startDate), 'MMM d, yyyy')} />
                    )}
                    {isEditingSubscriptionDates ? (
                      <Input
                        label="End Date"
                        type="date"
                        value={subscriptionDateDraft.endDate}
                        onChange={(event) => setSubscriptionDateDraft((current) => ({ ...current, endDate: event.target.value }))}
                        error={subscriptionError && !subscriptionDateDraft.endDate ? 'End date is required' : undefined}
                      />
                    ) : (
                      <InfoItem label="End Date" value={format(new Date(company.subscription.endDate), 'MMM d, yyyy')} />
                    )}
                    <InfoItem label="Billing" value={company.subscription.billingCycle} />
                    <InfoItem label="Amount" value={`₱${company.subscription.amount.toLocaleString()} / ${company.subscription.billingCycle === 'Monthly' ? 'month' : 'year'}`} />
                  </div>

                  {subscriptionError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{subscriptionError}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No active subscription found.</p>
              )}
            </div>
          ) : null}

          {activeTab === 'Payments' ? (
            company.payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments yet.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-100 text-sm text-slate-700">
                        <td className="px-4 py-3">{format(new Date(payment.date), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3">₱{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">{payment.method}</td>
                        <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function InfoItem({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className={`mt-2 text-sm ${emphasize ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{value}</div>
    </div>
  )
}