import { useEffect, useState } from 'react'
import type { DashboardStats } from '../types/superAdmin'
import { getDashboardStats } from '../api/superAdminApi'

export function useDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  async function refresh() {
    setIsLoading(true)
    try {
      const result = await getDashboardStats()
      setData(result)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return { data, isLoading, error, refresh }
}