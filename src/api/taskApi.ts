import { axiosInstance } from './axiosInstance'

export type ProjectTask = {
  id: string
  projectId: string
  title: string
  description?: string | null
  assignedToUserId: string
  assignedByUserId: string
  status: string
  priority: string
  dueDate: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskStatus = 'Todo' | 'InProgress' | 'UnderReview' | 'Done' | 'Blocked'

export type TaskPayload = {
  title: string
  description?: string
  assignedToUserId: string
  priority: TaskPriority
  dueDate: string
}

export async function getProjectTasks(projectId: string) {
  const { data } = await axiosInstance.get<ProjectTask[]>(`/projects/${projectId}/tasks`)
  return data
}

export async function getTaskById(id: string) {
  const { data } = await axiosInstance.get<ProjectTask>(`/tasks/${id}`)
  return data
}

export async function getMyTasks() {
  const { data } = await axiosInstance.get<ProjectTask[]>('/tasks/my')
  return data
}

export async function createProjectTask(projectId: string, payload: TaskPayload) {
  const { data } = await axiosInstance.post<ProjectTask>(`/projects/${projectId}/tasks`, payload)
  return data
}

export async function updateTask(id: string, payload: TaskPayload) {
  const { data } = await axiosInstance.put<ProjectTask>(`/tasks/${id}`, payload)
  return data
}

export async function updateTaskStatus(id: string, payload: { status: TaskStatus }) {
  const { data } = await axiosInstance.patch<ProjectTask>(`/tasks/${id}/status`, payload)
  return data
}

export async function deleteTask(id: string) {
  await axiosInstance.delete(`/tasks/${id}`)
}