import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { checkSuperAdminRole } from '../lib/api'

interface SuperAdminGuardProps {
  children: ReactNode
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const location = useLocation()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'is-super-admin'],
    queryFn: checkSuperAdminRole,
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      toast.error('Access denied — SuperAdmin only.')
    }
  }, [isLoading, isError, data])

  if (isLoading) {
    return <div className="page-skeleton">Checking access...</div>
  }

  if (isError || !data) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
