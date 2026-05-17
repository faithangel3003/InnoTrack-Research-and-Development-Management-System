import { ShieldAlert } from 'lucide-react'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/ui/Card'

type RoleRouteProps = {
  allowedRoles: string[]
  children: React.ReactNode
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user } = useAuth()
  const allowed = !!user && allowedRoles.includes(user.role)

  return (
    <ProtectedRoute>
      {allowed ? (
        <>{children}</>
      ) : (
        <div className="page-container">
          <Card>
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-danger" />
              <div>
                <h1 className="text-lg font-semibold text-neutral-800">403 Forbidden</h1>
                <p className="text-sm text-neutral-600">You do not have permission to access this area.</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </ProtectedRoute>
  )
}
