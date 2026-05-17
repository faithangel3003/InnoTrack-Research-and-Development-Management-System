import { useCallback, useEffect, useMemo, useState } from 'react'
import * as paymentApi from '../api/paymentApi'
import type { PagedResponse, Payment, PaymentFilters, PaymentSummary } from '../types/superAdmin'

const defaultFilters: PaymentFilters = {
  page: 1,
  pageSize: 20,
  search: '',
  status: '',
  method: '',
}

export function usePayments() {
  const [filters, setFilters] = useState<PaymentFilters>(defaultFilters)
  const [response, setResponse] = useState<PagedResponse<Payment>>({ items: [], page: 1, pageSize: 20, total: 0 })
  const [summary, setSummary] = useState<PaymentSummary>({ total: 0, totalRevenue: 0, pending: 0, failed: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilters((current) => ({ ...current, page: 1, search: searchInput.trim() }))
    }, 400)

    return () => window.clearTimeout(handle)
  }, [searchInput])

  const refresh = useCallback(async (nextFilters: PaymentFilters) => {
    setIsLoading(true)
    try {
      const [tableData, summaryData] = await Promise.all([
        paymentApi.getAll(nextFilters),
        paymentApi.getSummary(),
      ])

      setResponse(tableData)
      setSummary(summaryData)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh(filters)
  }, [filters, refresh])

  const pagination = useMemo(() => ({
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
  }), [response.page, response.pageSize, response.total])

  return {
    payments: response.items,
    summary,
    pagination,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    isLoading,
    error,
    clearFilters: () => {
      setSearchInput('')
      setFilters(defaultFilters)
    },
  }
}