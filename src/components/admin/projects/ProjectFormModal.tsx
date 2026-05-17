import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarRange, FolderKanban, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Project, ProjectPriority, ProjectStatus } from '../../../api/projectApi'
import { getErrorMessage } from '../../../utils/apiError'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { Select } from '../../ui/Select'
import { Textarea } from '../../ui/Textarea'

const projectPriorityValues = ['Low', 'Medium', 'High', 'Critical'] as const satisfies readonly ProjectPriority[]
const projectStatusValues = ['Draft', 'Active', 'OnHold', 'Completed', 'Cancelled'] as const satisfies readonly ProjectStatus[]

const schema = z.object({
  title: z.string().trim().min(3, 'Project title must be at least 3 characters').max(255, 'Project title must be 255 characters or less'),
  description: z.string().max(1200, 'Description must be 1200 characters or less').optional().or(z.literal('')),
  projectManagerUserId: z.string().optional().or(z.literal('')),
  memberUserIds: z.array(z.string()),
  priority: z.enum(projectPriorityValues),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(projectStatusValues),
  statusRemarks: z.string().max(500, 'Status remarks must be 500 characters or less').optional().or(z.literal('')),
}).refine((value) => new Date(value.endDate).getTime() >= new Date(value.startDate).getTime(), {
  path: ['endDate'],
  message: 'End date must be on or after the start date',
})

export type ProjectFormValues = z.infer<typeof schema>

type ProjectFormModalProps = {
  mode: 'create' | 'edit'
  project: Project | null
  projectManagerOptions: Array<{ value: string; label: string }>
  memberOptions: Array<{ value: string; label: string }>
  assignedProjectManagerId?: string
  assignedMemberIds?: string[]
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
}

function toDateInputValue(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function defaultValues(project: Project | null, assignedProjectManagerId = '', assignedMemberIds: string[] = []): ProjectFormValues {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 30)

  return project
    ? {
        title: project.title,
        description: project.description || '',
        projectManagerUserId: assignedProjectManagerId,
        memberUserIds: assignedMemberIds,
        priority: (project.priority as ProjectPriority) || 'Medium',
        startDate: toDateInputValue(project.startDate),
        endDate: toDateInputValue(project.endDate),
        status: (project.status as ProjectStatus) || 'Draft',
        statusRemarks: '',
      }
    : {
        title: '',
        description: '',
        projectManagerUserId: assignedProjectManagerId,
        memberUserIds: assignedMemberIds,
        priority: 'Medium',
        startDate: toDateInputValue(now),
        endDate: toDateInputValue(endDate),
        status: 'Draft',
        statusRemarks: '',
      }
}

export function ProjectFormModal({
  mode,
  project,
  projectManagerOptions,
  memberOptions,
  assignedProjectManagerId = '',
  assignedMemberIds = [],
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: ProjectFormModalProps) {
  const [formError, setFormError] = useState('')
  const formId = useMemo(() => `project-form-${mode}`, [mode])
  const managerOptions = useMemo(() => [
    {
      value: '',
      label: projectManagerOptions.length ? 'Assign a Project Manager later' : 'No Project Managers available yet',
    },
    ...projectManagerOptions,
  ], [projectManagerOptions])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(project, assignedProjectManagerId, assignedMemberIds),
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset(defaultValues(project, assignedProjectManagerId, assignedMemberIds))
    setFormError('')
  }, [assignedMemberIds, assignedProjectManagerId, isOpen, project, reset])

  async function submit(values: ProjectFormValues) {
    try {
      setFormError('')
      await onSubmit({
        ...values,
        description: values.description?.trim() || '',
        memberUserIds: values.memberUserIds.filter(Boolean),
        statusRemarks: values.statusRemarks?.trim() || '',
      })
    } catch (error) {
      setFormError(getErrorMessage(error, `Failed to ${mode === 'create' ? 'create' : 'update'} project`))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title={mode === 'create' ? 'Create Project' : 'Edit Project'}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {mode === 'create' ? 'Create Project' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="mb-5 rounded-[1.5rem] border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Delivery Control</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {mode === 'create' ? 'Launch a structured project workspace' : 'Refresh scope, dates, and delivery posture'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Use the planning card below to keep every project consistent. Validation runs before submit and highlights issues immediately.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Sparkles size={16} className="text-sky-600" />
              Stakeholder-ready form
            </div>
            <p className="mt-1 text-xs text-slate-500">Status changes create timeline history automatically.</p>
          </div>
        </div>
      </div>

      <form id={formId} className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Input
              label="Project Title"
              requiredField
              leftIcon={<FolderKanban size={16} />}
              error={errors.title?.message}
              placeholder="AI-assisted Patent Screening"
              {...register('title')}
            />

            <Textarea
              label="Description"
              hint="Summarize the business goal, expected outcome, and delivery scope."
              error={errors.description?.message}
              placeholder="Describe the problem space, success criteria, and the teams involved."
              {...register('description')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Project Manager"
                hint={projectManagerOptions.length
                  ? 'Optional on create. Leave blank if you want to assign the lead later.'
                  : 'Create the project now, then add a Project Manager later from User Management.'}
                error={errors.projectManagerUserId?.message}
                options={managerOptions}
                {...register('projectManagerUserId')}
              />
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Team Members</span>
                <select
                  multiple
                  className="min-h-[8rem] w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 transition focus:border-sky-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-100"
                  disabled={!memberOptions.length}
                  {...register('memberUserIds')}
                >
                  {memberOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">Hold Ctrl to select multiple members.</span>
              </label>
            </div>

            <Textarea
              label="Status Remarks"
              hint="Optional context for timeline shifts, approvals, or blockers."
              error={errors.statusRemarks?.message}
              placeholder="Example: Waiting for compliance sign-off before reactivating execution."
              {...register('statusRemarks')}
            />
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Priority"
                requiredField
                error={errors.priority?.message}
                options={projectPriorityValues.map((value) => ({ value, label: value }))}
                {...register('priority')}
              />
              <Select
                label="Status"
                requiredField
                error={errors.status?.message}
                options={[
                  { value: 'Draft', label: 'Planning' },
                  { value: 'Active', label: 'Active' },
                  { value: 'OnHold', label: 'On Hold' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Cancelled', label: 'Cancelled' },
                ]}
                {...register('status')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Date"
                requiredField
                type="date"
                leftIcon={<CalendarRange size={16} />}
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <Input
                label="End Date"
                requiredField
                type="date"
                leftIcon={<CalendarRange size={16} />}
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UsersRound size={16} className="text-sky-600" />
                Assignment Rules
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Each project requires one Project Manager lead.</li>
                <li>Selected members are added to the project workspace after save.</li>
                <li>End dates cannot be scheduled before the start date.</li>
              </ul>
            </div>
          </div>
        </div>

        {formError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}
      </form>
    </Modal>
  )
}