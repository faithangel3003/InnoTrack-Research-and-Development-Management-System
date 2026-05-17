export type SuperAdminRole = 'SuperAdmin'

export type CompanyStatus = 'Active' | 'Inactive' | 'Pending'
export type SubscriptionPlan = 'Starter' | 'Professional' | 'Enterprise'
export type SubscriptionStatus = 'Active' | 'Trial' | 'Expired' | 'Cancelled'
export type BillingCycle = 'Monthly' | 'Yearly'
export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded'
export type PaymentMethod = 'Card' | 'Bank Transfer' | 'GCash' | 'GrabPay' | 'Maya' | 'PayMongo' | 'Manual'
export type ReportType = 'revenue' | 'payments'
export type ReportFormat = 'pdf' | 'xlsx'

export type PagedResponse<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type RevenuePoint = {
  month: string
  revenue: number
}

export type SubscriptionDistributionItem = {
  plan: SubscriptionPlan
  count: number
  percentage: number
}

export type RecentCompany = {
  id: string
  name: string
  email: string
  status: CompanyStatus
  plan: SubscriptionPlan
  registeredAt: string
}

export type RecentPayment = {
  id: string
  companyId: string
  companyName: string
  amount: number
  status: PaymentStatus
  date: string
}

export type DashboardStats = {
  totalCompanies: number
  activeCompanies: number
  newCompaniesThisMonth: number
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  totalUsers: number
  totalRevenue: number
  monthlyRevenue: number
  revenueGrowthPercent: number
  avgRevenuePerMonth: number
  revenueByMonth: RevenuePoint[]
  subscriptionDistribution: SubscriptionDistributionItem[]
  recentCompanies: RecentCompany[]
  recentPayments: RecentPayment[]
}

export type Company = {
  id: string
  name: string
  email: string
  contactName: string
  contactEmail: string
  status: CompanyStatus
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus | CompanyStatus
  registeredAt: string
}

export type Subscription = {
  id: string
  companyId: string
  companyName: string
  companyEmail: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startDate: string
  endDate: string
  billingCycle: BillingCycle
  amount: number
}

export type Payment = {
  id: string
  companyId: string
  companyName: string
  companyEmail: string
  referenceNumber: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  date: string
  description?: string | null
  billingPeriodStart?: string | null
  billingPeriodEnd?: string | null
  gatewayMessage?: string | null
}

export type CompanyDetail = Company & {
  phone?: string | null
  address?: string | null
  contactRole?: string | null
  industry?: string | null
  lastActiveAt?: string | null
  subscription?: Subscription | null
  payments: Payment[]
}

export type CompanyFormPayload = {
  name: string
  email: string
  password?: string
  phone?: string | null
  address?: string | null
  contactName: string
  contactRole?: string | null
  industry?: string | null
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  billingCycle: BillingCycle
  amount: number
  isActive: boolean
}

export type SubscriptionSummary = {
  total: number
  active: number
  trial: number
  expired: number
  cancelled: number
}

export type PaymentSummary = {
  total: number
  totalRevenue: number
  pending: number
  failed: number
}

export type StatusCount = {
  status: string
  count: number
}

export type TopCompanyPayment = {
  companyName: string
  amount: number
  transactionCount: number
}

export type ReportPreview = {
  type: ReportType
  startDate: string
  endDate: string
  totalRevenue: number
  totalCompanies: number
  totalInvoices: number
  paid: number
  pending: number
  failed: number
  monthlyBreakdown: RevenuePoint[]
  statusDistribution: StatusCount[]
  topCompanyPayments: TopCompanyPayment[]
}

export type CompanyFilters = {
  page: number
  pageSize: number
  search: string
  status: string
}

export type SubscriptionFilters = {
  page: number
  pageSize: number
  search: string
  status: string
  plan: string
  companyId?: string
}

export type PaymentFilters = {
  page: number
  pageSize: number
  search: string
  status: string
  method: string
  startDate?: string
  endDate?: string
}

export type ReportPreviewParams = {
  type: ReportType
  startDate: string
  endDate: string
  status?: string
}

export type ReportDownloadParams = ReportPreviewParams & {
  format: ReportFormat
}