import { useCallback, useEffect, useState } from 'react'
import * as organizationApi from '../api/organizationApi'
import { useAuth } from './useAuth'
import { normalizeRole } from '../utils/roleHelpers'

export function useOrganizations() {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<organizationApi.Organization[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrganizations = useCallback(async () => {
    setLoading(true)
    try {
      if (normalizeRole(user?.role) !== 'SuperAdmin') {
        setOrganizations(user?.organizationId ? [{ id: user.organizationId, name: 'Current organization' }] : [])
        return
      }

      const data = await organizationApi.getAllOrganizations()
      setOrganizations(data)
    } catch {
      setOrganizations(user?.organizationId ? [{ id: user.organizationId, name: 'Current organization' }] : [])
    } finally {
      setLoading(false)
    }
  }, [user?.organizationId, user?.role])

  useEffect(() => {
    void fetchOrganizations()
  }, [fetchOrganizations])

  return {
    organizations,
    loading,
    fetchOrganizations,
  }
}
