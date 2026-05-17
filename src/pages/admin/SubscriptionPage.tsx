import { format, subMonths } from 'date-fns'
import { CalendarDays, FolderKanban, ReceiptText, ShieldCheck, Users } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../api/projectApi'
import * as subscriptionApi from '../../api/subscriptionApi'
import * as userApi from '../../api/userApi'
import type { Subscription } from '../../types/superAdmin'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../context/ToastContext'
import { countActiveProjects } from '../../utils/projectMetrics'

type PlanName = 'Starter' | 'Professional' | 'Enterprise'

const planLimits: Record<PlanName, { seats: number; projects: number }> = {
  Starter: { seats: 20, projects: 100 },
  Professional: { seats: 75, projects: 500 },
  Enterprise: { seats: 250, projects: 2000 },
}

const planFeatures: Record<PlanName, string[]> = {
  Starter: [
    '20 Users',
    '100 Projects',
    'Task Management',
    'Knowledge Base',
    'Calendar & Scheduling',
    'Audit Logging',
  ],
  Professional: [
    '75 Users',
    '500 Projects',
    'Task Management',
    'Product Lifecycle',
    'Knowledge Base',
    'Calendar & Scheduling',
    'Audit Logging',
    'Advanced Reports',
    'Priority Support',
  ],
  Enterprise: [
    '250 Users',
    '2000 Projects',
    'Task Management',
    'Product Lifecycle',
    'Knowledge Base',
    'Calendar & Scheduling',
    'Audit Logging',
    'Advanced Reports',
    'Priority Support',
    'Dedicated Support Channel',
  ],
}

function usageWidth(used: number, limit: number) {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function subscriptionStatusClass(status?: string | null) {
  const value = status?.toLowerCase() ?? 'active'
  if (value === 'trial') return 'bg-amber-50 text-amber-700'
  if (value === 'expired' || value === 'cancelled') return 'bg-rose-50 text-rose-700'
  return 'bg-emerald-50 text-emerald-700'
}

function UsageCard({
  icon,
  label,
  used,
  limit,
  helper,
}: {
  icon: ReactNode
  label: string
  used: number
  limit: number
  helper: string
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 text-slate-900">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">{icon}</div>
        <p className="text-base font-semibold">{label}</p>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-4xl font-semibold tracking-tight text-slate-900">{used}</span>
        <span className="pb-1 text-lg font-semibold text-slate-300">/{limit}</span>
      </div>

      <div className="mt-5 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-sky-700" style={{ width: `${usageWidth(used, limit)}%` }} />
      </div>

      <p className="mt-4 text-sm text-slate-500">{helper}</p>
    </section>
  )
}

export function SubscriptionPage() {
  const toast = useToast()
  const [projects, setProjects] = useState<projectApi.Project[]>([])
  const [users, setUsers] = useState<userApi.User[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRenew, setAutoRenew] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [referenceNow, setReferenceNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      try {
        const [projectData, userData, subscriptionData] = await Promise.all([
          projectApi.getAllProjects(),
          userApi.getAllUsers({ page: 1, pageSize: 100, search: '', roleId: '', isActive: '' }),
          subscriptionApi.getCurrentOrganizationSubscription().catch(() => null),
        ])

        if (!active) {
          return
        }

        setProjects(projectData)
        setUsers(userData.data)
        setSubscription(subscriptionData)
        setError('')
      } catch (loadError) {
        if (!active) {
          return
        }
        setProjects([])
        setUsers([])
        setSubscription(null)
        setError(loadError instanceof Error ? loadError.message : 'Failed to load subscription data')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setReferenceNow(Date.now())
  }, [subscription?.endDate])

  const activeUsers = useMemo(
    () => users.filter((entry) => entry.isActive ?? entry.status === 'active').length,
    [users],
  )
  const plan = ((subscription?.plan === 'Professional' || subscription?.plan === 'Enterprise' || subscription?.plan === 'Starter') ? subscription.plan : 'Starter') as PlanName
  const pricing = subscription?.amount ?? { Starter: 999, Professional: 2499, Enterprise: 4999 }[plan]
  const seatLimit = planLimits[plan].seats
  const projectLimit = planLimits[plan].projects
  const activeProjects = useMemo(() => countActiveProjects(projects), [projects])
  const nextRenewal = subscription?.endDate ? format(new Date(subscription.endDate), 'MMMM d, yyyy') : '-'
  const startDate = subscription?.startDate ? format(new Date(subscription.startDate), 'MMMM d, yyyy') : '-'
  const daysRemaining = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - referenceNow) / (1000 * 60 * 60 * 24)))
    : 0
  const cycleLabel = subscription?.billingCycle === 'Yearly' ? 'yearly' : 'monthly'
  const featureColumns = useMemo(() => {
    const features = planFeatures[plan]
    const splitIndex = Math.ceil(features.length / 2)
    return [features.slice(0, splitIndex), features.slice(splitIndex)]
  }, [plan])

  const billingHistory = useMemo(
    () => Array.from({ length: 3 }, (_, index) => ({
      period: format(subMonths(new Date(), index), 'MMMM yyyy'),
      amount: pricing,
      status: index === 0 ? 'Upcoming' : 'Paid',
    })),
    [pricing],
  )

  function downloadBillingSummary() {
    const payload = {
      plan,
      amount: pricing,
      billingCycle: subscription?.billingCycle || 'Monthly',
      status: subscription?.status || 'Active',
      renewalDate: nextRenewal,
      users: activeUsers,
      projects: activeProjects,
      autoRenew,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'billing-summary.json'
    document.body.append(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    toast.success('Billing summary downloaded')
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${subscriptionStatusClass(subscription?.status)}`}>
              {subscription?.status || 'Active'}
            </span>
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900">{plan}</h2>
            <p className="mt-2 text-sm text-slate-500">{subscription?.companyName || 'Organization workspace'}</p>
          </div>

          <div className="flex flex-col items-start gap-4 md:items-end">
            <div className="text-left md:text-right">
              <p className="text-5xl font-semibold tracking-tight text-slate-900">₱{pricing.toLocaleString('en-PH')}</p>
              <p className="mt-1 text-sm text-slate-400">/{cycleLabel}</p>
            </div>

            <Button variant="secondary" leftIcon={<ReceiptText size={16} />} onClick={() => setShowHistory((value) => !value)}>
              Payment History
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <CalendarDays size={14} />
              Start Date
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">{startDate}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <CalendarDays size={14} />
              Expiry Date
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">{nextRenewal}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <ShieldCheck size={14} />
              Days Remaining
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">{daysRemaining} days</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">Auto-Renew</p>
            <p className="text-xs text-slate-400">Keep your plan active without manual renewal.</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoRenew((value) => !value)}
            className={autoRenew ? 'relative h-7 w-12 rounded-full bg-sky-700' : 'relative h-7 w-12 rounded-full bg-slate-300'}
          >
            <span className={autoRenew ? 'absolute right-1 top-1 h-5 w-5 rounded-full bg-white' : 'absolute left-1 top-1 h-5 w-5 rounded-full bg-white'} />
          </button>
        </div>
      </section>

      {showHistory ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
              <p className="mt-1 text-sm text-slate-500">Recent subscription cycles for this organization.</p>
            </div>
            <Button variant="secondary" onClick={downloadBillingSummary}>Download Summary</Button>
          </div>

          <div className="mt-6 space-y-3">
            {billingHistory.map((entry) => (
              <div key={entry.period} className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{entry.period}</p>
                  <p className="text-xs text-slate-400">Subscription cycle</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">₱{entry.amount.toLocaleString('en-PH')}</p>
                  <p className={entry.status === 'Paid' ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>{entry.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <UsageCard icon={<Users size={18} />} label="Users" used={activeUsers} limit={seatLimit} helper="Active users in your company" />
        <UsageCard icon={<FolderKanban size={18} />} label="Projects" used={activeProjects} limit={projectLimit} helper="Active projects in your company" />
      </div>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
        <h3 className="text-lg font-semibold text-slate-900">Plan Features</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {featureColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="space-y-4">
              {column.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="text-emerald-500">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {loading ? <p className="text-sm text-slate-400">Refreshing subscription usage data...</p> : null}
    </div>
  )
}