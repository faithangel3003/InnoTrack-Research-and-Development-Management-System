import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/authApi'
import { AuthContext, type AuthContextValue } from './auth-context'

type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  organizationId: string | null
  mustChangePassword: boolean
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

function roleRedirect(role: string) {
  if (role === 'SuperAdmin' || role === 'SystemAdmin' || role === 'Super Admin' || role === 'System Admin') {
    return '/admin/dashboard'
  }
  if (role === 'ProjectManager' || role === 'Project Manager') return '/projects'
  if (role === 'TeamMember' || role === 'Team Member') return '/admin/dashboard'
  return '/my-tasks'
}

function mapRole(user: authApi.AuthUserProfile | undefined): string {
  if (!user) return 'TeamMember'
  if (user.role) {
    return user.role
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .replace('Super Admin', 'SuperAdmin')
      .replace('System Admin', 'SystemAdmin')
      .replace('Project Manager', 'ProjectManager')
      .replace('Team Member', 'TeamMember')
  }
  if (user.roles && user.roles.length > 0) {
    const highestPriorityRole = [...user.roles].sort((left, right) => rolePriority(left) - rolePriority(right))[0]
    const normalized = highestPriorityRole
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .replace('Super Admin', 'SuperAdmin')
      .replace('System Admin', 'SystemAdmin')
      .replace('Project Manager', 'ProjectManager')
      .replace('Team Member', 'TeamMember')
    return normalized
  }
  return 'TeamMember'
}

function splitFullName(fullName?: string) {
  const parts = (fullName || '').split(' ').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  }
}

function buildAuthUser(user: authApi.AuthUserProfile): AuthUser {
  const derivedName = splitFullName(user.fullName || user.name)

  return {
    id: user.id,
    firstName: (user.firstName || derivedName.firstName || '').trim(),
    lastName: (user.lastName || derivedName.lastName || '').trim(),
    email: user.email,
    role: mapRole(user),
    organizationId: user.organizationId || null,
    mustChangePassword: Boolean(user.mustChangePassword),
  }
}

function rolePriority(role: string) {
  const normalized = role.replaceAll('_', '').replaceAll(' ', '').toLowerCase()

  switch (normalized) {
    case 'superadmin':
      return 0
    case 'systemadmin':
      return 1
    case 'projectmanager':
      return 2
    default:
      return 3
  }
}

function shouldClearSessionAfterRefreshFailure(error: unknown) {
  if (!isAxiosError(error)) {
    return false
  }

  const status = error.response?.status
  return status === 401 || status === 403
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('innotrack_token') || '')
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('innotrack_user')
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as Partial<AuthUser>
    return {
      id: parsed.id || '',
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      role: parsed.role || 'TeamMember',
      organizationId: parsed.organizationId || null,
      mustChangePassword: Boolean(parsed.mustChangePassword),
    }
  })

  const clearSession = useCallback((redirect = false) => {
    localStorage.removeItem('innotrack_token')
    localStorage.removeItem('innotrack_user')
    setToken('')
    setUser(null)

    if (redirect) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const persistUser = useCallback((nextUser: AuthUser) => {
    localStorage.setItem('innotrack_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const isTokenExpired = useCallback(() => {
    if (!token) return true
    const payload = decodeJwtPayload(token)
    const exp = typeof payload?.exp === 'number' ? payload.exp : undefined
    if (!exp) return false
    return Date.now() >= exp * 1000
  }, [token])

  const refreshUser = useCallback(async () => {
    if (!token) {
      return
    }

    const currentUser = await authApi.getCurrentUser()
    persistUser(buildAuthUser(currentUser))
  }, [persistUser, token])

  useEffect(() => {
    let active = true

    async function hydrateSession() {
      if (token && isTokenExpired()) {
        clearSession()
        if (active) {
          setIsLoading(false)
        }
        return
      }

      if (token) {
        try {
          await refreshUser()
        } catch (error) {
          if (shouldClearSessionAfterRefreshFailure(error)) {
            clearSession()
          }
        }
      }

      if (active) {
        setIsLoading(false)
      }
    }

    void hydrateSession()

    return () => {
      active = false
    }
  }, [clearSession, isTokenExpired, refreshUser, token])

  useEffect(() => {
    function onAuthExpired() {
      clearSession(true)
    }

    window.addEventListener('innotrack:auth-expired', onAuthExpired)
    return () => window.removeEventListener('innotrack:auth-expired', onAuthExpired)
  }, [clearSession])

  const login = useCallback(async (email: string, password: string, captchaToken: string, captchaChallengeId?: string) => {
    const data = await authApi.login(email, password, captchaToken, captchaChallengeId)

    const incomingUser = data.user
    if (!incomingUser) {
      throw new Error('Invalid login response')
    }

    const nextUser = buildAuthUser(incomingUser)

    const nextToken = data.token || data.accessToken || `session.${btoa(JSON.stringify({ sub: nextUser.id, role: nextUser.role }))}.token`

    localStorage.setItem('innotrack_token', nextToken)
    setToken(nextToken)
    persistUser(nextUser)
    navigate(nextUser.mustChangePassword ? '/auth/change-password' : roleRedirect(nextUser.role), { replace: true })
  }, [navigate, persistUser])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) {
      throw new Error('You must be signed in to change your password')
    }

    await authApi.changePassword(currentPassword, newPassword)

    const nextUser = { ...user, mustChangePassword: false }
    persistUser(nextUser)
    navigate(roleRedirect(nextUser.role), { replace: true })
  }, [navigate, persistUser, user])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // no-op to ensure local logout still happens
    }
    clearSession(true)
  }, [clearSession])

  const hasRole = useCallback((...roles: string[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    changePassword,
    refreshUser,
    logout,
    hasRole,
    isTokenExpired,
  }), [changePassword, hasRole, isLoading, isTokenExpired, login, logout, refreshUser, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
