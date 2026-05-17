import { axiosInstance } from './axiosInstance'
import type { DashboardStats } from '../types/superAdmin'

export async function getDashboardStats() {
  const { data } = await axiosInstance.get<DashboardStats>('/superadmin/dashboard')
  return data
}