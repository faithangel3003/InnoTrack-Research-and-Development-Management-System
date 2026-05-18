import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizations } from '../../hooks/useOrganizations'
import { useRoles } from '../../hooks/useRoles'
import { useTeams } from '../../hooks/useTeams'
import { useUsers } from '../../hooks/useUsers'
import { normalizeRole } from '../../utils/roleHelpers'
import { decodeHtmlEntities } from '../../utils/text'

const schema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string(),
    roleId: z.string().min(1, 'Role is required'),
    companyId: z.string().optional(),
    teamId: z.string().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

function passwordScore(value: string) {
  let score = 0
  if (value.length >= 12) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  return score
}

export function CreateUserPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { roles, loading: rolesLoading } = useRoles()
  const { organizations, loading: organizationsLoading } = useOrganizations()
  const { createUser } = useUsers()
  const canSelectCompany = normalizeRole(user?.role) === 'SuperAdmin'

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      roleId: '',
      companyId: user?.organizationId || '',
      teamId: '',
    },
  })

  const selectedCompanyId = watch('companyId') || ''
  const selectedTeamId = watch('teamId') || ''
  const { teams, loading: teamsLoading } = useTeams(selectedCompanyId || null)

  const assignableRoles = useMemo(() => roles.filter((role) => !['SuperAdmin', 'SystemAdmin'].includes(normalizeRole(role.roleName))), [roles])
  const roleOptions = useMemo(() => [{ value: '', label: 'Select role' }, ...assignableRoles.map((role) => ({ value: String(role.id), label: role.roleName }))], [assignableRoles])
  const companyOptions = useMemo(
    () => [{ value: '', label: 'Select company' }, ...organizations.map((org) => ({ value: org.id, label: org.name }))],
    [organizations],
  )
  const teamOptions = useMemo(
    () => [{ value: '', label: teams.length > 0 ? 'No team' : 'No team available' }, ...teams.map((team) => ({ value: team.id, label: decodeHtmlEntities(team.name) }))],
    [teams],
  )
  const strength = passwordScore(watch('password'))

  useEffect(() => {
    if (!canSelectCompany && user?.organizationId) {
      setValue('companyId', user.organizationId)
    }
  }, [canSelectCompany, setValue, user?.organizationId])

  async function onSubmit(values: FormValues) {
    const companyId = canSelectCompany ? values.companyId?.trim() || '' : user?.organizationId || ''
    if (!companyId) {
      setError('companyId', { message: 'Company is required' })
      return
    }

    clearErrors('companyId')

    const toastId = toast.loading('Creating user...')
    try {
      await createUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        roleId: Number(values.roleId),
        organizationId: companyId,
        teamId: values.teamId || null,
      })
      toast.dismiss(toastId)
      toast.success('User created successfully')
      navigate('/admin/users')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create New User" subtitle="Add a new user to the system" actions={<Link to="/admin/users" className="text-sm text-primary-600"><ArrowLeft className="mr-1 inline" size={14} />Back</Link>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="User Information" className="lg:col-span-2">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First Name" requiredField error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last Name" requiredField error={errors.lastName?.message} {...register('lastName')} />
            </div>

            <Input label="Email Address" requiredField error={errors.email?.message} {...register('email')} />
            <Input label="Password" requiredField error={errors.password?.message} showPasswordToggle {...register('password')} />
            <Input label="Confirm Password" requiredField error={errors.confirmPassword?.message} showPasswordToggle {...register('confirmPassword')} />

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Password Strength</p>
              <div className="h-2 rounded-full bg-neutral-200">
                <div className={`h-full rounded-full ${strength <= 1 ? 'bg-danger' : strength <= 3 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${(strength / 4) * 100}%` }} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Role"
                requiredField
                options={roleOptions}
                error={errors.roleId?.message}
                disabled={rolesLoading}
                value={watch('roleId')}
                onChange={(event) => setValue('roleId', event.target.value, { shouldDirty: true, shouldValidate: true })}
              />
              {canSelectCompany ? (
                <Select
                  label="Company"
                  requiredField
                  options={companyOptions}
                  error={errors.companyId?.message}
                  disabled={organizationsLoading}
                  value={selectedCompanyId}
                  onChange={(event) => {
                    clearErrors('companyId')
                    setValue('companyId', event.target.value, { shouldDirty: true, shouldValidate: true })
                    setValue('teamId', '', { shouldDirty: true })
                  }}
                />
              ) : (
                <Select
                  label="Team"
                  options={teamOptions}
                  disabled={teamsLoading}
                  value={selectedTeamId}
                  onChange={(event) => setValue('teamId', event.target.value, { shouldDirty: true, shouldValidate: true })}
                  hint="Assign the user to a tenant team if needed."
                />
              )}
            </div>

            {canSelectCompany ? (
              <Select
                label="Team"
                options={teamOptions}
                disabled={teamsLoading || !selectedCompanyId}
                value={selectedTeamId}
                onChange={(event) => setValue('teamId', event.target.value, { shouldDirty: true, shouldValidate: true })}
                hint="Choose a company first, then optionally assign a team inside that tenant."
              />
            ) : null}

            {!canSelectCompany ? <p className="text-xs text-neutral-500">Users created from this screen stay inside your current company tenant. Team assignment is optional.</p> : null}
            {canSelectCompany && selectedCompanyId && !teamsLoading && teams.length === 0 ? <p className="text-xs text-neutral-500">This company has no teams yet. Create them from User Management if you want to group users.</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => navigate('/admin/users')}>Cancel</Button>
              <Button type="submit" loading={isSubmitting} leftIcon={<UserPlus size={16} />}>Create User</Button>
            </div>
          </form>
        </Card>

        <Card title="Role Descriptions" subtitle="Choose the role carefully.">
          <ul className="space-y-3 text-sm text-neutral-600">
            <li><strong>ProjectManager:</strong> Manages projects</li>
            <li><strong>TeamMember:</strong> Updates assigned tasks</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
