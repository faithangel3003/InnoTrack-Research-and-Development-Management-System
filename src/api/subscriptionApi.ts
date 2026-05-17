import { axiosInstance } from './axiosInstance'
import type {
  PagedResponse,
  Subscription,
  SubscriptionFilters,
  SubscriptionSummary,
} from '../types/superAdmin'

export async function getAll(params: SubscriptionFilters) {
  const { data } = await axiosInstance.get<PagedResponse<Subscription>>('/subscriptions', { params })
  return data
}

export async function getSummary() {
  const { data } = await axiosInstance.get<SubscriptionSummary>('/subscriptions/summary')
  return data
}

export async function getCurrentOrganizationSubscription() {
  const { data } = await axiosInstance.get<Subscription>('/subscriptions/current')
  return data
}

export async function update(id: string, payload: Omit<Subscription, 'id' | 'companyId' | 'companyName' | 'companyEmail'>) {
  const { data } = await axiosInstance.put<Subscription>(`/subscriptions/${id}`, payload)
  return data
}