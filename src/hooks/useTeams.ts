import { useCallback, useEffect, useState } from 'react'
import * as teamApi from '../api/teamApi'
import { normalizeRole } from '../utils/roleHelpers'
import { useAuth } from './useAuth'

export function useTeams(selectedOrganizationId?: string | null) {
  const { user } = useAuth()
  const isSuperAdmin = normalizeRole(user?.role) === 'SuperAdmin'
  const activeOrganizationId = isSuperAdmin ? selectedOrganizationId ?? '' : user?.organizationId ?? ''

  const [teams, setTeams] = useState<teamApi.Team[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  const fetchTeams = useCallback(async () => {
    if (!isSuperAdmin && !user?.organizationId) {
      setTeams([])
      setError('')
      setLoading(false)
      return
    }

    if (isSuperAdmin && !activeOrganizationId) {
      setTeams([])
      setError('')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await teamApi.getAllTeams(activeOrganizationId ? { organizationId: activeOrganizationId } : undefined)
      setTeams(data)
      setError('')
    } catch (error) {
      setTeams([])
      setError(error instanceof Error ? error.message : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }, [activeOrganizationId, isSuperAdmin, user?.organizationId])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  const createTeam = useCallback(async (payload: teamApi.CreateTeamPayload) => {
    if (isSuperAdmin && !activeOrganizationId) {
      throw new Error('Select a company first')
    }

    setSaving(true)
    try {
      const created = await teamApi.createTeam(isSuperAdmin ? { ...payload, organizationId: activeOrganizationId } : payload)
      await fetchTeams()
      return created
    } finally {
      setSaving(false)
    }
  }, [activeOrganizationId, fetchTeams, isSuperAdmin])

  const updateTeam = useCallback(async (id: string, payload: teamApi.UpdateTeamPayload) => {
    setSaving(true)
    try {
      const updated = await teamApi.updateTeam(id, payload)
      setTeams((current) => current.map((team) => (team.id === id ? updated : team)))
      return updated
    } finally {
      setSaving(false)
    }
  }, [fetchTeams])

  const deleteTeam = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await teamApi.deleteTeam(id)
      await fetchTeams()
    } finally {
      setDeletingId('')
    }
  }, [fetchTeams])

  return {
    teams,
    loading,
    saving,
    deletingId,
    error,
    clearError: () => setError(''),
    refreshTeams: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
  }
}