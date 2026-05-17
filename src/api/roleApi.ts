import { axiosInstance } from './axiosInstance'

export type Role = {
  id: number
  roleName: string
  description: string
}

export async function getAllRoles() {
  const { data } = await axiosInstance.get<Role[]>('/roles')
  return data
}
