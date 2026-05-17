import { axiosInstance } from './axiosInstance'

export type Project = {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  startDate: string
  endDate: string
  createdByUserId: string
  organizationId: string
  createdAt: string
  updatedAt: string
  memberCount: number
  totalTasks: number
  completedTasks: number
}

export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type ProjectStatus = 'Draft' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled'
export type ProjectMemberRole = 'Lead' | 'Contributor' | 'Observer'

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  memberRole: ProjectMemberRole
  joinedAt: string
}

export type CreateProjectPayload = {
  title: string
  description?: string
  priority: ProjectPriority
  startDate: string
  endDate: string
  organizationId: string
}

export type UpdateProjectPayload = {
  title: string
  description?: string
  priority: ProjectPriority
  startDate: string
  endDate: string
}

export async function getAllProjects() {
  const { data } = await axiosInstance.get<Project[]>('/projects')
  return data
}

export async function getProjectById(id: string) {
  const { data } = await axiosInstance.get<Project>(`/projects/${id}`)
  return data
}

export async function createProject(payload: CreateProjectPayload) {
  const { data } = await axiosInstance.post<Project>('/projects', payload)
  return data
}

export async function updateProject(id: string, payload: UpdateProjectPayload) {
  const { data } = await axiosInstance.put<Project>(`/projects/${id}`, payload)
  return data
}

export async function deleteProject(id: string) {
  await axiosInstance.delete(`/projects/${id}`)
}

export async function changeProjectStatus(id: string, payload: { status: ProjectStatus; remarks?: string }) {
  const { data } = await axiosInstance.patch<Project>(`/projects/${id}/status`, payload)
  return data
}

export async function getProjectMembers(projectId: string) {
  const { data } = await axiosInstance.get<ProjectMember[]>(`/projects/${projectId}/members`)
  return data
}

export async function addProjectMember(projectId: string, payload: { userId: string; memberRole: ProjectMemberRole }) {
  const { data } = await axiosInstance.post<ProjectMember>(`/projects/${projectId}/members`, payload)
  return data
}

export async function removeProjectMember(projectId: string, userId: string) {
  await axiosInstance.delete(`/projects/${projectId}/members/${userId}`)
}