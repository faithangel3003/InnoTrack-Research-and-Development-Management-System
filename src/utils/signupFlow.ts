export type SignupPlanId = 'starter' | 'professional' | 'enterprise'

export type SignupDraft = {
  companyName: string
  industry: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  planId: SignupPlanId
}

export type SignupPlan = {
  id: SignupPlanId
  name: string
  priceMonthly: number
  seatsLabel: string
  projectsLabel: string
  blurb: string
  featured?: boolean
}

const SIGNUP_DRAFT_KEY = 'innotrack_signup_draft'

export const industryOptions = [
  'Technology',
  'Education',
  'Healthcare',
  'Agriculture',
  'Manufacturing',
  'Government',
  'Research Institute',
  'Startup',
  'Other',
]

export const signupPlans: SignupPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 999,
    seatsLabel: '35 users',
    projectsLabel: '100 projects',
    blurb: 'A lean setup for emerging R&D teams.',
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 2499,
    seatsLabel: '75 users',
    projectsLabel: '500 projects',
    blurb: 'Best for growing teams managing multiple innovation streams.',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 4999,
    seatsLabel: 'Unlimited users',
    projectsLabel: 'Unlimited projects',
    blurb: 'For large organizations needing scale, governance, and priority support.',
  },
]

export function getSignupPlan(planId: SignupPlanId) {
  return signupPlans.find((plan) => plan.id === planId) ?? signupPlans[1]
}

export function saveSignupDraft(draft: SignupDraft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
}

export function loadSignupDraft(): SignupDraft | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(SIGNUP_DRAFT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SignupDraft>

    if (
      typeof parsed.companyName !== 'string'
      || typeof parsed.industry !== 'string'
      || typeof parsed.firstName !== 'string'
      || typeof parsed.lastName !== 'string'
      || typeof parsed.email !== 'string'
      || typeof parsed.phoneNumber !== 'string'
      || (parsed.planId !== 'starter' && parsed.planId !== 'professional' && parsed.planId !== 'enterprise')
    ) {
      return null
    }

    return parsed as SignupDraft
  } catch {
    return null
  }
}

export function clearSignupDraft() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SIGNUP_DRAFT_KEY)
}

export function formatPeso(amount: number, fractionDigits = 0) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}