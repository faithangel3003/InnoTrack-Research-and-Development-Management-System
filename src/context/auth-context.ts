import { createContext } from 'react'

type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  organizationId: string | null
  mustChangePassword: boolean
}

export type AuthContextValue = {
  user: AuthUser | null
  token: string
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, captchaToken: string, captchaChallengeId?: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  hasRole: (...roles: string[]) => boolean
  isTokenExpired: () => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
