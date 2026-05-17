import { useCallback, useEffect, useState } from 'react'
import * as roleApi from '../api/roleApi'

export function useRoles() {
  const [roles, setRoles] = useState<roleApi.Role[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await roleApi.getAllRoles()
      setRoles(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRoles()
  }, [fetchRoles])

  return {
    roles,
    loading,
    fetchRoles,
  }
}
