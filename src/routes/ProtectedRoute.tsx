import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'

function defaultRoute(role: string) {
  if (role === 'SuperAdmin' || role === 'SystemAdmin' || role === 'Super Admin' || role === 'System Admin') {
    return '/admin/dashboard'
  }

  if (role === 'ProjectManager' || role === 'Project Manager') {
    return '/projects'
  }

  if (role === 'TeamMember' || role === 'Team Member') {
    return '/admin/dashboard'
  }

  return '/my-tasks'
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isLoading, isTokenExpired, logout, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isTokenExpired()) {
    void logout()
    return <Navigate to="/login" replace />
  }

  if (user?.mustChangePassword && location.pathname !== '/auth/change-password') {
    return <Navigate to="/auth/change-password" replace />
  }

  if (!user?.mustChangePassword && location.pathname === '/auth/change-password') {
    return <Navigate to={defaultRoute(user?.role || 'TeamMember')} replace />
  }

  return <>{children}</>
}
