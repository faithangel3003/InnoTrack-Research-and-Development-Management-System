import { Building2, LockKeyhole, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Company, CompanyDetail } from '../../types/superAdmin'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CompanyFilters } from '../../components/superadmin/companies/CompanyFilters'
import { CompanyFormModal } from '../../components/superadmin/companies/CompanyFormModal'
import { CompanyTable } from '../../components/superadmin/companies/CompanyTable'
import { CompanyDetailModal } from '../../components/superadmin/companies/CompanyDetailModal'
import { useCompanies } from '../../hooks/useCompanies'
import { getErrorMessage } from '../../utils/apiError'

export function CompaniesPage() {
  const {
    companies,
    pagination,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    isLoading,
    error,
    selectedCompany,
    setSelectedCompany,
    isDetailLoading,
    isSaving,
    isSubscriptionSaving,
    actionLoadingId,
    getCompanyDetail,
    openDetails,
    createCompany,
    updateCompany,
    deleteCompany,
    saveSubscription,
    activate,
    deactivate,
    clearFilters,
  } = useCompanies()

  const [dismissedError, setDismissedError] = useState(false)
  type PendingAction = { company: Company; mode: 'deactivate' | 'delete' }
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [reauthAction, setReauthAction] = useState<PendingAction | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyDetail | null>(null)
  const [isPreparingForm, setIsPreparingForm] = useState(false)
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const message = dismissedError ? '' : error
  const isReauthLoading = reauthAction ? actionLoadingId === reauthAction.company.id : false

  useEffect(() => {
    if (error) {
      setDismissedError(false)
    }
  }, [error])

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null

    if (pendingAction.mode === 'deactivate') {
      return {
        title: 'Deactivate Company',
        message: `Deactivate ${pendingAction.company.name}? All users under this company will lose access immediately.`,
        confirmText: 'Yes, Deactivate',
        variant: 'danger' as const,
      }
    }

    return {
      title: 'Delete Company',
      message: `Delete ${pendingAction.company.name}? This removes the company record, its users, and related company data.`,
      confirmText: 'Yes, Delete',
      variant: 'danger' as const,
    }
  }, [pendingAction])

  const reauthConfig = useMemo(() => {
    if (!reauthAction) return null

    const actionLabel = reauthAction.mode === 'delete' ? 'delete' : 'deactivate'
    return {
      title: 'Admin password required',
      message: `Enter your admin password to ${actionLabel} ${reauthAction.company.name}.`,
      confirmText: reauthAction.mode === 'delete' ? 'Delete Company' : 'Deactivate Company',
      variant: 'danger' as const,
    }
  }, [reauthAction])

  function handleOpenReauth() {
    if (!pendingAction) return

    setReauthAction(pendingAction)
    setAdminPassword('')
    setPendingAction(null)
  }

  function handleCloseReauth() {
    setReauthAction(null)
    setAdminPassword('')
  }

  async function handleConfirmReauth() {
    if (!reauthAction) return

    const trimmedPassword = adminPassword.trim()
    if (!trimmedPassword) {
      toast.error('Admin password is required for this action')
      return
    }

    if (reauthAction.mode === 'deactivate') {
      await deactivate(reauthAction.company, trimmedPassword)
    } else {
      await deleteCompany(reauthAction.company, trimmedPassword)
    }

    handleCloseReauth()
  }

  async function handleOpenCreate() {
    setFormMode('create')
    setEditingCompany(null)
    setIsFormOpen(true)
  }

  async function handleOpenEdit(company: Company) {
    setIsPreparingForm(true)
    try {
      const detail = selectedCompany?.id === company.id ? selectedCompany : await getCompanyDetail(company.id)
      setSelectedCompany(null)
      setFormMode('edit')
      setEditingCompany(detail)
      setIsFormOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load company details'))
    } finally {
      setIsPreparingForm(false)
    }
  }

  async function handleSaveCompany(values: Parameters<typeof createCompany>[0]) {
    if (formMode === 'create') {
      await createCompany(values)
    } else if (editingCompany) {
      await updateCompany(editingCompany.id, values)
    }

    setIsFormOpen(false)
    setEditingCompany(null)
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={message} onDismiss={() => setDismissedError(true)} />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-400">Manage all registered organizations</p>
        </div>
        <Button type="button" onClick={() => void handleOpenCreate()} leftIcon={<Plus className="h-4 w-4" />}>
          Create Company
        </Button>
      </section>

      <CompanyFilters
        searchValue={searchInput}
        status={filters.status}
        onSearchChange={setSearchInput}
        onStatusChange={(value) => setFilters((current) => ({ ...current, page: 1, status: value }))}
        onClear={clearFilters}
      />

      <CompanyTable
        companies={companies}
        isLoading={isLoading}
        actionLoadingId={actionLoadingId}
        onView={(company) => void openDetails(company.id)}
        onEdit={(company) => void handleOpenEdit(company)}
        onActivate={(company) => void activate(company)}
        onDeactivate={(company) => setPendingAction({ company, mode: 'deactivate' })}
        onDelete={(company) => setPendingAction({ company, mode: 'delete' })}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={totalPages}
        totalItems={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />

      <CompanyDetailModal
        company={selectedCompany}
        isOpen={!!selectedCompany || isDetailLoading}
        isLoading={isDetailLoading}
        isActionLoading={Boolean(actionLoadingId)}
        isSubscriptionSaving={isSubscriptionSaving}
        onClose={() => setSelectedCompany(null)}
        onEdit={(company) => void handleOpenEdit(company)}
        onActivate={(company) => void activate(company)}
        onDelete={(company) => setPendingAction({ company, mode: 'delete' })}
        onDeactivate={(company) => setPendingAction({ company, mode: 'deactivate' })}
        onSaveSubscription={saveSubscription}
      />

      <CompanyFormModal
        mode={formMode}
        company={editingCompany}
        isOpen={isFormOpen}
        isSaving={isSaving || isPreparingForm}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCompany(null)
        }}
        onSubmit={handleSaveCompany}
      />

      {confirmConfig ? (
        <ConfirmDialog
          isOpen
          onClose={() => setPendingAction(null)}
          onConfirm={handleOpenReauth}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          variant={confirmConfig.variant}
          loading={pendingAction ? actionLoadingId === pendingAction.company.id : false}
        />
      ) : null}

      {reauthConfig ? (
        <Modal
          isOpen
          onClose={isReauthLoading ? () => undefined : handleCloseReauth}
          title={reauthConfig.title}
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseReauth}
                disabled={isReauthLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <Button
                variant={reauthConfig.variant}
                loading={isReauthLoading}
                type="submit"
                form="company-reauth-form"
              >
                {reauthConfig.confirmText}
              </Button>
            </div>
          }
        >
          <form
            id="company-reauth-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void handleConfirmReauth()
            }}
          >
            <p className="text-sm text-slate-600">{reauthConfig.message}</p>
            <Input
              label="Admin Password"
              type="password"
              requiredField
              showPasswordToggle
              leftIcon={<LockKeyhole className="h-4 w-4" />}
              placeholder="Enter your admin password"
              autoComplete="current-password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              disabled={isReauthLoading}
            />
          </form>
        </Modal>
      ) : null}

      {isPreparingForm ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
          <Building2 className="h-4 w-4 animate-pulse text-sky-600" />
          Preparing company form...
        </div>
      ) : null}
    </div>
  )
}