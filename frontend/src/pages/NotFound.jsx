import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_HOME = { Admin: '/dashboard', Supervisor: '/dashboard', Agent: '/complaints', Customer: '/my-complaints' }

export default function NotFound() {
  const { user } = useAuth()
  const home = user ? (ROLE_HOME[user.role] || '/dashboard') : '/login'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="text-8xl font-black text-primary-100 mb-4 select-none">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <Link to={home} className="btn-primary px-6 py-3">
          ← Go back home
        </Link>
      </div>
    </div>
  )
}
