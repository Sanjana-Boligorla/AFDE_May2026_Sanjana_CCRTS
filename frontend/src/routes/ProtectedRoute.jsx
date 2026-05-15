import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Role → default landing page
const ROLE_HOME = {
  Admin:      '/dashboard',
  Supervisor: '/dashboard',
  Agent:      '/complaints',
  Customer:   '/my-complaints',
}

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />
  }

  return <Outlet />
}

export const PublicRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    const home = ROLE_HOME[user.role] || '/dashboard'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}
