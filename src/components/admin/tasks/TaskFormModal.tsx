import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, ListTodo, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { ProjectTask, TaskPriority, TaskStatus } from '../../../api/taskApi'
import { getErrorMessage } from '../../../utils/apiError'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'
import { Select } from '../../ui/Select'
import { Textarea } from '../../ui/Textarea'

const taskPriorityValues = ['Low', 'Medium', 'High', 'Critical'] as const satisfies readonly TaskPriority[]
const taskStatusValues = ['Todo', 'InProgress', 'UnderReview', 'Done', 'Blocked'] as const satisfies readonly TaskStatus[]

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().trim().min(3, 'Task title must be at least 3 characters').max(255, 'Task title must be 255 characters or less'),
  description: z.string().max(1200, 'Description must be 1200 characters or less').optional().or(z.literal('')),
  assignedToUserId: z.string().min(1, 'Assignee is required'),
  priority: z.enum(taskPriorityValues),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(taskStatusValues),
})

export type TaskFormValues = z.infer<typeof schema>

type TaskFormModalProps = {
  mode: 'create' | 'edit'
  task: ProjectTask | null
  projectTitle?: string
  projects: Array<{ value: string; label: string }>
  assignees: Array<{ value: string; label: string }>
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
}

function toDateInputValue(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

function defaultValues(task: ProjectTask | null, projects: Array<{ value: string; label: string }>): TaskFormValues {
  const now = new Date()
  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + 7)

  return task
    ? {
        projectId: task.projectId,
        title: task.title,
        description: task.description || '',
        assignedToUserId: task.assignedToUserId,
        priority: (task.priority as TaskPriority) || 'Medium',
        dueDate: toDateInputValue(task.dueDate),
        status: (task.status as TaskStatus) || 'Todo',
      }
    : {
        projectId: projects[0]?.value || '',
        title: '',
        description: '',
        assignedToUserId: '',
        priority: 'Medium',
        dueDate: toDateInputValue(dueDate),
        status: 'Todo',
      }
}

function formatStatusLabel(value: TaskStatus) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function TaskFormModal({
  mode,
  task,
  projectTitle,
  projects,
  assignees,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [formError, setFormError] = useState('')
  const formId = useMemo(() => `task-form-${mode}`, [mode])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(task, projects),
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset(defaultValues(task, projects))
    setFormError('')
  }, [isOpen, projects, reset, task])

  async function submit(values: TaskFormValues) {
    try {
      setFormError('')
      await onSubmit({
        ...values,
        description: values.description?.trim() || '',
      })
    } catch (error) {
      setFormError(getErrorMessage(error, `Failed to ${mode === 'create' ? 'create' : 'update'} task`))
    }
  }

  const projectSelectionLocked = mode === 'edit'

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onClose}
      title={mode === 'create' ? 'Create Task' : 'Edit Task'}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="mb-5 rounded-[1.5rem] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Execution Queue</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {mode === 'create' ? 'Capture a task with clear ownership and due date' : 'Keep task ownership, due date, and delivery status aligned'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              This task form validates the assignee, due date, and status before saving. Invalid fields are highlighted immediately.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <Sparkles size={16} className="text-emerald-600" />
              Clean handoff
            </div>
            <p className="mt-1 text-xs text-slate-500">Status updates stay available after save for daily execution.</p>
          </div>
        </div>
      </div>

      <form id={formId} className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Input
              label="Task Title"
              requiredField
              leftIcon={<ListTodo size={16} />}
              error={errors.title?.message}
              placeholder="Prototype the automated reviewer dashboard"
              {...register('title')}
            />

            <Textarea
              label="Description"
              hint="Add acceptance criteria or delivery notes for the assignee."
              error={errors.description?.message}
              placeholder="Describe what done looks like, dependencies, and any review constraints."
              {...register('description')}
            />
          </div>

          <div className="space-y-5">
            {projectSelectionLocked ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Project</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{projectTitle || 'Current project'}</p>
                <p className="mt-1 text-xs text-slate-500">Project assignment is fixed during task edits.</p>
              </div>
            ) : (
              <Select
                label="Project"
                requiredField
                error={errors.projectId?.message}
                options={projects.length ? projects : [{ value: '', label: 'No projects available' }]}
                disabled={!projects.length}
                {...register('projectId')}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Assignee"
                requiredField
                error={errors.assignedToUserId?.message}
                options={assignees.length ? assignees : [{ value: '', label: 'No assignees available' }]}
                disabled={!assignees.length}
                {...register('assignedToUserId')}
              />
              <Select
                label="Priority"
                requiredField
                error={errors.priority?.message}
                options={taskPriorityValues.map((value) => ({ value, label: value }))}
                {...register('priority')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Due Date"
                requiredField
                type="date"
                leftIcon={<CalendarClock size={16} />}
                error={errors.dueDate?.message}
                {...register('dueDate')}
              />
              <Select
                label="Status"
                requiredField
                error={errors.status?.message}
                options={taskStatusValues.map((value) => ({ value, label: formatStatusLabel(value) }))}
                {...register('status')}
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound size={16} className="text-emerald-600" />
                Form Rules
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Tasks always need an assignee so accountability stays visible.</li>
                <li>Status can be changed later from the board without reopening the form.</li>
                <li>Move blocked work quickly to avoid stale due dates in the dashboard.</li>
              </ul>
            </div>
          </div>
        </div>

        {formError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p> : null}
      </form>
    </Modal>
  )
}