import { axiosInstance } from './axiosInstance'
import type { ReportDownloadParams, ReportPreview, ReportPreviewParams } from '../types/superAdmin'

export async function getPreview(params: ReportPreviewParams) {
  const { data } = await axiosInstance.get<ReportPreview>('/reports/preview', { params })
  return data
}

export async function download(type: string, params: ReportDownloadParams) {
  const { data, headers } = await axiosInstance.get<Blob>(`/reports/${type}`, {
    params,
    responseType: 'blob',
  })

  return {
    blob: data,
    fileName: headers['content-disposition'] as string | undefined,
  }
}