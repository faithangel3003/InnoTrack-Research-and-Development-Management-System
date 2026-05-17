import { axiosInstance } from './axiosInstance'
import type { Company, CompanyDetail, CompanyFilters, CompanyFormPayload, PagedResponse } from '../types/superAdmin'

export async function getAll(params: CompanyFilters) {
  const { data } = await axiosInstance.get<PagedResponse<Company>>('/companies', { params })
  return data
}

export async function getById(id: string) {
  const { data } = await axiosInstance.get<CompanyDetail>(`/companies/${id}`)
  return data
}

export async function create(payload: CompanyFormPayload) {
  const { data } = await axiosInstance.post<CompanyDetail>('/companies', payload)
  return data
}

export async function update(id: string, payload: CompanyFormPayload) {
  const { data } = await axiosInstance.put<CompanyDetail>(`/companies/${id}`, payload)
  return data
}

export async function remove(id: string) {
  await axiosInstance.delete(`/companies/${id}`)
}

export async function approve(id: string) {
  await axiosInstance.patch(`/companies/${id}/approve`)
}

export async function activate(id: string) {
  await axiosInstance.patch(`/companies/${id}/activate`)
}

export async function deactivate(id: string) {
  await axiosInstance.patch(`/companies/${id}/deactivate`)
}

export async function removeWithReauth(id: string, adminPassword: string) {
  await axiosInstance.delete(`/companies/${id}`, {
    headers: {
      'X-Admin-Password': adminPassword,
    },
  })
}

export async function deactivateWithReauth(id: string, adminPassword: string) {
  await axiosInstance.patch(`/companies/${id}/deactivate`, undefined, {
    headers: {
      'X-Admin-Password': adminPassword,
    },
  })
}