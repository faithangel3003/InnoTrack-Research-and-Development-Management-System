import { axiosInstance } from './axiosInstance'

export type User = {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email: string
  roleId?: number
  roleName?: string
  organizationId?: string | null
  organizationName?: string
  organization?: string
  teamId?: string | null
  teamName?: string | null
  isActive?: boolean
  status?: 'active' | 'inactive'
  createdAtUtc?: string
  updatedAtUtc?: string
  lastLogin?: string
  projectCount?: number
  taskCount?: number
}

export type UserListResponse = {
  data: User[]
  total: number
  page: number
}

export type CreateUserPayload = {
  firstName: string
  lastName: string
  email: string
  password: string
  roleId: number
  organizationId?: string | null
  teamId?: string | null
}

export type UpdateUserPayload = {
  firstName: string
  lastName: string
  email: string
  roleId: number
  organizationId?: string | null
  teamId?: string | null
  isActive: boolean
  password?: string | undefined
}

export async function getAllUsers(params: {
  page?: number
  pageSize?: number
  search?: string
  roleId?: string | number
  isActive?: string | boolean
}) {
  const { data } = await axiosInstance.get<User[] | UserListResponse>('/users', { params })

  if (Array.isArray(data)) {
    const page = Number(params.page || 1)
    const pageSize = Number(params.pageSize || 10)
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

export async function getAccessibleUsers(params?: {
  page?: number
  pageSize?: number
}) {
  const { data } = await axiosInstance.get<User[] | UserListResponse>('/users', { params })
  return Array.isArray(data) ? data : data.data
}

export async function getUserById(id: string) {
  const { data } = await axiosInstance.get<User>(`/users/${id}`)
  return data
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await axiosInstance.post<User>('/users', payload)
  return data
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const { data } = await axiosInstance.put<User>(`/users/${id}`, payload)
  return data
}

export async function deactivateUser(id: string) {
  await axiosInstance.patch(`/users/${id}/deactivate`)
}

export async function changeUserRole(id: string, roleId: number) {
  await axiosInstance.patch(`/users/${id}/role`, { roleId })
}
