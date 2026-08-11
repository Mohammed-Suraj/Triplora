import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

export function ProtectedAdminRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
          aria-hidden="true"
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (user.role !== 'ADMIN') {
    return <ForbiddenPage />
  }

  return <Outlet />
}
