import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ReportDownloadParams, ReportPreviewParams, ReportType } from '../../../types/superAdmin'
import { Spinner } from '../../ui/Spinner'

const schema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.string().optional(),
  format: z.enum(['pdf', 'xlsx']),
}).refine((value) => new Date(value.endDate) > new Date(value.startDate), {
  path: ['endDate'],
  message: 'End date must be after start date',
})

type FormValues = z.infer<typeof schema>

type ReportFilterFormProps = {
  type: ReportType
  allowStatus?: boolean
  previewLoading: boolean
  downloadLoading: boolean
  onPreview: (params: ReportPreviewParams) => Promise<void>
  onDownload: (type: ReportType, params: ReportDownloadParams) => Promise<void>
}

export function ReportFilterForm({ type, allowStatus = false, previewLoading, downloadLoading, onPreview, onDownload }: ReportFilterFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      startDate: '',
      endDate: '',
      status: '',
      format: 'pdf',
    },
  })

  const selectedFormat = watch('format')

  async function preview(values: FormValues) {
    await onPreview({
      type,
      startDate: values.startDate,
      endDate: values.endDate,
      status: allowStatus ? values.status || undefined : undefined,
    })
  }

  async function download(values: FormValues) {
    await onDownload(type, {
      type,
      startDate: values.startDate,
      endDate: values.endDate,
      status: allowStatus ? values.status || undefined : undefined,
      format: values.format,
    })
  }

  return (
    <form className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">From</span>
          <input
            type="date"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.startDate ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`}
            {...register('startDate')}
          />
          {errors.startDate?.message ? <span className="mt-1 block text-xs text-red-500">{errors.startDate.message}</span> : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">To</span>
          <input
            type="date"
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none transition ${errors.endDate ? 'border-red-300' : 'border-slate-200'} focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20`}
            {...register('endDate')}
          />
          {errors.endDate?.message ? <span className="mt-1 block text-xs text-red-500">{errors.endDate.message}</span> : null}
        </label>
      </div>

      {allowStatus ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Payment Status Filter</span>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-900/20" {...register('status')}>
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </label>
      ) : null}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Export Format</span>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(['pdf', 'xlsx'] as const).map((format) => (
            <label key={format} className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition ${selectedFormat === format ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              <input type="radio" value={format} className="sr-only" {...register('format')} />
              {format === 'pdf' ? 'PDF' : 'Excel'}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSubmit(preview)}
          disabled={!isValid || previewLoading || downloadLoading}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {previewLoading ? 'Loading preview...' : 'Preview Report'}
        </button>

        <button
          type="button"
          onClick={handleSubmit(download)}
          disabled={!isValid || previewLoading || downloadLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {downloadLoading ? <Spinner size="sm" color="border-white" /> : null}
          {downloadLoading ? 'Generating...' : 'Download Report ↓'}
        </button>
      </div>
    </form>
  )
}
