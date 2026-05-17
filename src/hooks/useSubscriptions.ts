import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import * as subscriptionApi from '../api/subscriptionApi'
import type {
  PagedResponse,
  Subscription,
  SubscriptionFilters,
  SubscriptionSummary,
} from '../types/superAdmin'

const defaultFilters: SubscriptionFilters = {
  page: 1,
  pageSize: 10,
  search: '',
  status: '',
  plan: '',
}

export function useSubscriptions() {
  const [filters, setFilters] = useState<SubscriptionFilters>(defaultFilters)
  const [response, setResponse] = useState<PagedResponse<Subscription>>({ items: [], page: 1, pageSize: 10, total: 0 })
  const [summary, setSummary] = useState<SubscriptionSummary>({ total: 0, active: 0, trial: 0, expired: 0, cancelled: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() }))
    }, 400)

    return () => window.clearTimeout(handle)
  }, [searchInput])

  const refresh = useCallback(async (nextFilters: SubscriptionFilters) => {
    setIsLoading(true)
    try {
      const [tableData, summaryData] = await Promise.all([
        subscriptionApi.getAll(nextFilters),
        subscriptionApi.getSummary(),
      ])

      setResponse(tableData)
      setSummary(summaryData)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load subscriptions')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(filters)
  }, [filters, refresh])

  async function saveSubscription(
    subscriptionId: string,
    payload: Omit<Subscription, 'id' | 'companyId' | 'companyName' | 'companyEmail'>,
  ) {
    setIsSaving(true)
    try {
      const updated = await subscriptionApi.update(subscriptionId, payload)
      setResponse((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === subscriptionId ? updated : item)),
      }))
      setSummary(await subscriptionApi.getSummary())
      toast.success('Subscription updated successfully')
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update subscription'
      toast.error(message)
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const pagination = useMemo(() => ({
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
  }), [response.page, response.pageSize, response.total])

  return {
    subscriptions: response.items,
    summary,
    pagination,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    isLoading,
    isSaving,
    error,
    saveSubscription,
    clearFilters: () => {
      setSearchInput('')
      setFilters(defaultFilters)
    },
  }
}