import { axiosInstance } from './axiosInstance'

export type AuditLog = {
  id: string
  userId?: string | null
  userName?: string
  userEmail?: string
  action: string
  module: string
  details?: string
  ipAddress?: string
  timestampUtc: string
}

export type AuditLogListResponse = {
  data: AuditLog[]
  total: number
  page: number
}

export async function getAuditLogs(params: {
  page?: number
  pageSize?: number
  userId?: string
  startDate?: string
  endDate?: string
}) {
  const { data } = await axiosInstance.get<AuditLog[] | AuditLogListResponse>('/auditlogs', { params })

  if (Array.isArray(data)) {
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 20)
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      data: data.slice(start, end),
      total: data.length,
      page,
    }
  }

  return data
}

export async function getAuditLogsByUser(userId: string, params: { page?: number; pageSize?: number }) {
  const { data } = await axiosInstance.get<AuditLog[] | AuditLogListResponse>(`/auditlogs/${userId}`, { params })

  if (Array.isArray(data)) {
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 20)
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      data: data.slice(start, end),
      total: data.length,
      page,
    }
  }

  return data
}
