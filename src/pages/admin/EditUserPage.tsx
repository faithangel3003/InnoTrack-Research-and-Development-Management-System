import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '../../components/layout/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ToggleSwitch } from '../../components/ui/ToggleSwitch'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizations } from '../../hooks/useOrganizations'
import { useRoles } from '../../hooks/useRoles'
import { useTeams } from '../../hooks/useTeams'
import { useUsers } from '../../hooks/useUsers'
import { normalizeRole } from '../../utils/roleHelpers'

const schema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().optional(),
  roleId: z.string().min(1),
  companyId: z.string().optional(),
  teamId: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function EditUserPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { roles } = useRoles()
  const { organizations } = useOrganizations()
  const { getUserById, updateUser, deactivateUser } = useUsers()
  const canSelectCompany = normalizeRole(user?.role) === 'SuperAdmin'
  const canManageSensitiveFields = ['SystemAdmin', 'SuperAdmin'].includes(normalizeRole(user?.role))

  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')
  const [showDeactivate, setShowDeactivate] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
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
      roleId: '',
      companyId: '',
      teamId: '',
      isActive: true,
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
    () => [{ value: '', label: teams.length > 0 ? 'No team' : 'No team available' }, ...teams.map((team) => ({ value: team.id, label: team.name }))],
    [teams],
  )

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      try {
        const data = await getUserById(id)
        if (!mounted) return
        reset({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email,
          password: '',
          roleId: String(data.roleId || ''),
          companyId: data.organizationId || '',
          teamId: data.teamId || '',
          isActive: data.isActive ?? data.status === 'active',
        })
        setLastUpdated(data.updatedAtUtc || data.createdAtUtc || '')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load user')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [getUserById, id, reset, toast])

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

    const toastId = toast.loading('Saving user...')
    try {
      await updateUser(id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        roleId: Number(values.roleId),
        organizationId: companyId,
        teamId: values.teamId || null,
        isActive: values.isActive,
        password: values.password || undefined,
      })
      toast.dismiss(toastId)
      toast.success('User updated successfully')
      navigate('/admin/users')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  async function onDeactivate() {
    const toastId = toast.loading('Deactivating user...')
    try {
      await deactivateUser(id)
      toast.dismiss(toastId)
      toast.success('User deactivated successfully')
      setShowDeactivate(false)
      navigate('/admin/users')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 w-80 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-80 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit User"
        subtitle="Update user profile and access settings"
        actions={<Link to="/admin/users" className="text-sm text-primary-600"><ArrowLeft className="mr-1 inline" size={14} />Back</Link>}
      />

      <Card subtitle={lastUpdated ? `Last Updated: ${new Date(lastUpdated).toLocaleString()}` : undefined}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name" requiredField error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name" requiredField error={errors.lastName?.message} {...register('lastName')} />
          </div>

          <Input label="Email" requiredField error={errors.email?.message} {...register('email')} />
          <Input label="Password (optional)" hint="Leave blank to keep current password" error={errors.password?.message} showPasswordToggle {...register('password')} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              requiredField
              options={roleOptions}
              error={errors.roleId?.message}
              disabled={!canManageSensitiveFields}
              value={watch('roleId')}
              onChange={(event) => setValue('roleId', event.target.value, { shouldDirty: true, shouldValidate: true })}
            />
            {canSelectCompany ? (
              <Select
                label="Company"
                requiredField
                options={companyOptions}
                error={errors.companyId?.message}
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
                hint="Move the user into one of your tenant teams if needed."
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

          {!canManageSensitiveFields ? (
            <p className="text-xs text-neutral-500">Only administrators can change roles.</p>
          ) : null}

          {!canSelectCompany ? <p className="text-xs text-neutral-500">Only super admins can move a user to another company tenant. Team assignment is optional for tenant admins.</p> : null}
          {canSelectCompany && selectedCompanyId && !teamsLoading && teams.length === 0 ? <p className="text-xs text-neutral-500">This company has no teams yet. Create them from User Management if you want to group users.</p> : null}

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Active user</p>
                  <p className="mt-1 text-xs text-neutral-500">Turn this off to revoke workspace access without deleting the account.</p>
                </div>
                <ToggleSwitch checked={Boolean(field.value)} onChange={field.onChange} ariaLabel="Active user" />
              </div>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/admin/users')}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Save Changes</Button>
          </div>
        </form>
      </Card>

      {normalizeRole(user?.role) === 'SuperAdmin' ? (
        <Card title="Danger Zone" subtitle="Deactivating will revoke all system access.">
          <Button variant="danger" onClick={() => setShowDeactivate(true)}>Deactivate User</Button>
        </Card>
      ) : null}

      <ConfirmDialog
        isOpen={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={onDeactivate}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user? They will lose all system access."
        confirmText="Yes, Deactivate"
        confirmVariant="danger"
      />
    </div>
  )
}
