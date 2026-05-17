import { axiosInstance } from './axiosInstance'
import type { PagedResponse, Payment, PaymentFilters, PaymentSummary } from '../types/superAdmin'

export async function getAll(params: PaymentFilters) {
  const { data } = await axiosInstance.get<PagedResponse<Payment>>('/payments', { params })
  return data
}

export async function getSummary() {
  const { data } = await axiosInstance.get<PaymentSummary>('/payments/summary')
  return data
}