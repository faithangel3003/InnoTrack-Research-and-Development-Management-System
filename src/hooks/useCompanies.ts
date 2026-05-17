import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import * as companyApi from '../api/companyApi'
import * as subscriptionApi from '../api/subscriptionApi'
import type { Company, CompanyDetail, CompanyFilters, CompanyFormPayload, PagedResponse, Subscription } from '../types/superAdmin'
import { getErrorMessage } from '../utils/apiError'

const defaultFilters: CompanyFilters = {
  page: 1,
  pageSize: 10,
  search: '',
  status: '',
}

export function useCompanies() {
  const [filters, setFilters] = useState<CompanyFilters>(defaultFilters)
  const [response, setResponse] = useState<PagedResponse<Company>>({ items: [], page: 1, pageSize: 10, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubscriptionSaving, setIsSubscriptionSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string>('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() }))
    }, 400)

    return () => window.clearTimeout(handle)
  }, [searchInput])

  const refresh = useCallback(async (nextFilters: CompanyFilters) => {
    setIsLoading(true)
    try {
      const data = await companyApi.getAll(nextFilters)
      setResponse(data)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(filters)
  }, [filters, refresh])

  async function openDetails(companyId: string) {
    setIsDetailLoading(true)
    try {
      const detail = await companyApi.getById(companyId)
      setSelectedCompany(detail)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load company details')
    } finally {
      setIsDetailLoading(false)
    }
  }

  async function getCompanyDetail(companyId: string) {
    return companyApi.getById(companyId)
  }

  async function createCompany(payload: CompanyFormPayload) {
    setIsSaving(true)
    try {
      const detail = await companyApi.create(payload)
      toast.success(`${detail.name} has been created`)
      await refresh(filters)
      return detail
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create company'))
    } finally {
      setIsSaving(false)
    }
  }

  async function updateCompany(companyId: string, payload: CompanyFormPayload) {
    setIsSaving(true)
    try {
      const detail = await companyApi.update(companyId, payload)
      toast.success(`${detail.name} has been updated`)
      await refresh(filters)
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(detail)
      }

      return detail
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update company'))
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCompany(company: Company, adminPassword: string) {
    setActionLoadingId(company.id)
    try {
      await companyApi.removeWithReauth(company.id, adminPassword)
      toast.success(`${company.name} has been deleted`)

      if (selectedCompany?.id === company.id) {
        setSelectedCompany(null)
      }

      if (response.items.length === 1 && filters.page > 1) {
        setFilters((current) => ({ ...current, page: current.page - 1 }))
      } else {
        await refresh(filters)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete company'))
    } finally {
      setActionLoadingId('')
    }
  }

  async function saveSubscription(
    subscriptionId: string,
    payload: Omit<Subscription, 'id' | 'companyId' | 'companyName' | 'companyEmail'>,
  ) {
    setIsSubscriptionSaving(true)

    try {
      const updated = await subscriptionApi.update(subscriptionId, payload)
      toast.success('Subscription updated successfully')
      await refresh(filters)

      if (selectedCompany?.id === updated.companyId) {
        setSelectedCompany(await companyApi.getById(updated.companyId))
      }

      return updated
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update subscription'))
    } finally {
      setIsSubscriptionSaving(false)
    }
  }

  async function approve(company: Company) {
    setActionLoadingId(company.id)
    try {
      await companyApi.approve(company.id)
      toast.success(`${company.name} has been approved`)
      await refresh(filters)
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(await companyApi.getById(company.id))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve company')
    } finally {
      setActionLoadingId('')
    }
  }

  async function activate(company: Company) {
    setActionLoadingId(company.id)
    try {
      await companyApi.activate(company.id)
      toast.success(`${company.name} has been activated`)
      await refresh(filters)
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(await companyApi.getById(company.id))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate company')
    } finally {
      setActionLoadingId('')
    }
  }

  async function deactivate(company: Company, adminPassword: string) {
    setActionLoadingId(company.id)
    try {
      await companyApi.deactivateWithReauth(company.id, adminPassword)
      toast.success(`${company.name} has been deactivated`)
      await refresh(filters)
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(await companyApi.getById(company.id))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to deactivate company'))
    } finally {
      setActionLoadingId('')
    }
  }

  const pagination = useMemo(() => ({
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
  }), [response.page, response.pageSize, response.total])

  return {
    companies: response.items,
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
    approve,
    activate,
    deactivate,
    clearFilters: () => {
      setSearchInput('')
      setFilters(defaultFilters)
    },
  }
}