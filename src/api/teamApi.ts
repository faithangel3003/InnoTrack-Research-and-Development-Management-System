import { axiosInstance } from './axiosInstance'

export type Team = {
  id: string
  organizationId: string
  name: string
  description?: string | null
  memberCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export type CreateTeamPayload = {
  name: string
  description?: string
  organizationId?: string
}

export type UpdateTeamPayload = {
  name: string
  description?: string
}

export async function getAllTeams(params?: { organizationId?: string }) {
  const { data } = await axiosInstance.get<Team[]>('/teams', { params })
  return data
}

export async function createTeam(payload: CreateTeamPayload) {
  const { data } = await axiosInstance.post<Team>('/teams', payload)
  return data
}

export async function updateTeam(id: string, payload: UpdateTeamPayload) {
  const { data } = await axiosInstance.put<Team>(`/teams/${id}`, payload)
  return data
}

export async function deleteTeam(id: string) {
  await axiosInstance.delete(`/teams/${id}`)
}