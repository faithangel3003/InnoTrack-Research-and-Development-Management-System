import { axiosInstance } from './axiosInstance'

export type DocumentItem = {
  id: string
  title: string
  description?: string | null
  references?: string | null
  originalFileName: string
  fileType: string
  fileExtension: string
  fileSize: number
  version: number
  isArchived: boolean
  projectId?: string | null
  projectTitle?: string | null
  categoryId?: number | null
  categoryName?: string | null
  uploadedByUserId: string
  uploadedByName: string
  organizationId: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const DOCUMENT_UPLOAD_TIMEOUT_MS = (() => {
  const timeoutRaw = import.meta.env.VITE_DOCUMENT_UPLOAD_TIMEOUT_MS ?? import.meta.env.VITE_UPLOAD_TIMEOUT_MS
  const timeoutValue = Number(timeoutRaw)
  return Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : 120000
})()

export type DocumentVersion = {
  id: string
  versionNumber: number
  fileName: string
  fileSize: number
  changeNotes?: string | null
  uploadedByUserId: string
  createdAt: string
}

export type DocumentAccessLog = {
  id: string
  userId: string
  userName: string
  action: string
  accessedAt: string
  ipAddress?: string | null
}

export type DocumentDetail = DocumentItem & {
  versions: DocumentVersion[]
  accessLogs: DocumentAccessLog[]
}

export type DocumentCategory = {
  id: number
  name: string
  description?: string | null
  createdAt: string
}

export type DocumentTag = {
  id: number
  name: string
}

type DownloadPayload = {
  blob: Blob
  fileName: string
}

function resolveDownloadName(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) {
    return fallback
  }

  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(contentDisposition)
  const encodedName = match?.[1] || match?.[2]
  return encodedName ? decodeURIComponent(encodedName) : fallback
}

async function downloadFile(url: string, fallbackFileName: string): Promise<DownloadPayload> {
  const response = await axiosInstance.get<Blob>(url, { responseType: 'blob' })

  return {
    blob: response.data,
    fileName: resolveDownloadName(response.headers['content-disposition'], fallbackFileName),
  }
}

export async function getDocuments(params: {
  projectId?: string
  categoryId?: number
  search?: string
  tags?: string[]
  includeArchived?: boolean
}) {
  const { data } = await axiosInstance.get<DocumentItem[]>('/documents', { params })
  return data
}

export async function searchDocuments(params: {
  query?: string
  projectId?: string
  categoryId?: number
  tags?: string[]
  includeArchived?: boolean
}) {
  const { data } = await axiosInstance.get<DocumentItem[]>('/documents/search', {
    params: {
      q: params.query,
      projectId: params.projectId,
      categoryId: params.categoryId,
      tags: params.tags,
      includeArchived: params.includeArchived,
    },
  })
  return data
}

export async function getProjectDocuments(projectId: string, params?: {
  categoryId?: number
  search?: string
  tags?: string[]
  includeArchived?: boolean
}) {
  const { data } = await axiosInstance.get<DocumentItem[]>(`/projects/${projectId}/documents`, { params })
  return data
}

export async function getDocumentById(id: string) {
  const { data } = await axiosInstance.get<DocumentDetail>(`/documents/${id}`)
  return data
}

export async function getDocumentVersions(id: string) {
  const { data } = await axiosInstance.get<DocumentVersion[]>(`/documents/${id}/versions`)
  return data
}

export async function uploadDocument(formData: FormData) {
  const { data } = await axiosInstance.post<DocumentDetail>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: DOCUMENT_UPLOAD_TIMEOUT_MS,
  })
  return data
}

export async function updateDocument(id: string, payload: {
  title: string
  description?: string
  references?: string
  projectId?: string
  categoryId?: number
  tags: string[]
  isArchived: boolean
}) {
  const { data } = await axiosInstance.put<DocumentDetail>(`/documents/${id}`, payload)
  return data
}

export async function addDocumentVersion(id: string, formData: FormData) {
  const { data } = await axiosInstance.post<DocumentDetail>(`/documents/${id}/versions`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: DOCUMENT_UPLOAD_TIMEOUT_MS,
  })
  return data
}

export async function archiveDocument(id: string) {
  const { data } = await axiosInstance.patch<DocumentDetail>(`/documents/${id}/archive`)
  return data
}

export async function deleteDocument(id: string) {
  await axiosInstance.delete(`/documents/${id}`)
}

export async function downloadDocument(id: string, fallbackFileName: string) {
  return downloadFile(`/documents/${id}/download`, fallbackFileName)
}

export async function downloadDocumentVersion(id: string, versionNumber: number, fallbackFileName: string) {
  return downloadFile(`/documents/${id}/versions/${versionNumber}/download`, fallbackFileName)
}

export async function getCategories() {
  const { data } = await axiosInstance.get<DocumentCategory[]>('/documents/categories')
  return data
}

export async function createCategory(payload: { name: string; description?: string; organizationId?: string }) {
  const { data } = await axiosInstance.post<DocumentCategory>('/documents/categories', payload)
  return data
}

export async function updateCategory(id: number, payload: { name: string; description?: string; organizationId?: string }) {
  const { data } = await axiosInstance.put<DocumentCategory>(`/documents/categories/${id}`, payload)
  return data
}

export async function deleteCategory(id: number) {
  await axiosInstance.delete(`/documents/categories/${id}`)
}

export async function getTags() {
  const { data } = await axiosInstance.get<DocumentTag[]>('/documents/tags')
  return data
}

export async function createTag(payload: { name: string; organizationId?: string }) {
  const { data } = await axiosInstance.post<DocumentTag>('/documents/tags', payload)
  return data
}

export async function deleteTag(id: number) {
  await axiosInstance.delete(`/documents/tags/${id}`)
}