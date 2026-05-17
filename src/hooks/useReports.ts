import { useState } from 'react'
import toast from 'react-hot-toast'
import * as reportsApi from '../api/reportsApi'
import type { ReportDownloadParams, ReportPreview, ReportPreviewParams, ReportType } from '../types/superAdmin'
import { exportSuperAdminReportPdf } from '../utils/exportSuperAdminReportPdf'

function extractFilename(disposition: string | undefined, fallback: string) {
  if (!disposition) return fallback
  const match = disposition.match(/filename="?([^";]+)"?/i)
  return match?.[1] || fallback
}

export function useReports() {
  const [preview, setPreview] = useState<ReportPreview | null>(null)
  const [previewType, setPreviewType] = useState<ReportType>('revenue')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState('')

  async function previewReport(params: ReportPreviewParams) {
    setIsPreviewLoading(true)
    try {
      const data = await reportsApi.getPreview(params)
      setPreview(data)
      setPreviewType(params.type)
      setError('')
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to preview report'
      setError(message)
      toast.error(message)
      throw error
    } finally {
      setIsPreviewLoading(false)
    }
  }

  async function downloadReport(type: ReportType, params: ReportDownloadParams) {
    setIsDownloading(true)
    try {
      if (params.format === 'pdf') {
        const previewData = await reportsApi.getPreview({
          type,
          startDate: params.startDate,
          endDate: params.endDate,
          status: params.status,
        })

        setPreview(previewData)
        setPreviewType(type)
        setError('')

        await exportSuperAdminReportPdf(previewData, {
          type,
          fileName: `${type}-report-${params.startDate}-${params.endDate}.pdf`,
        })

        toast.success('Report downloaded successfully')
        return
      }

      const { blob, fileName } = await reportsApi.download(type, params)
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = extractFilename(fileName, `${type}-report.${params.format}`)
      document.body.append(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
      toast.success('Report downloaded successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download report'
      setError(message)
      toast.error(message)
      throw error
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    preview,
    previewType,
    isPreviewLoading,
    isDownloading,
    error,
    setPreview,
    previewReport,
    downloadReport,
  }
}