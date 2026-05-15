import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

// Auth pages
import Login          from './pages/auth/Login'
import Register       from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword  from './pages/auth/ResetPassword'

// App pages
import Dashboard from './pages/dashboard/Dashboard'
import NotFound  from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes (redirect if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"  element={<Dashboard />} />
              <Route path="/users"      element={<div className="card p-6 text-gray-400 text-sm text-center">User Management — Milestone 2</div>} />
              <Route path="/categories" element={<div className="card p-6 text-gray-400 text-sm text-center">Categories — Milestone 2</div>} />
              <Route path="/reports"    element={<div className="card p-6 text-gray-400 text-sm text-center">Reports — Milestone 3</div>} />
              <Route path="/escalations"element={<div className="card p-6 text-gray-400 text-sm text-center">Escalations — Milestone 3</div>} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Agent']} />}>
            <Route element={<AppLayout />}>
              <Route path="/complaints" element={<div className="card p-6 text-gray-400 text-sm text-center">Complaint Management — Milestone 2</div>} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
            <Route element={<AppLayout />}>
              <Route path="/my-complaints" element={<div className="card p-6 text-gray-400 text-sm text-center">My Complaints — Milestone 2</div>} />
              <Route path="/new-complaint" element={<div className="card p-6 text-gray-400 text-sm text-center">New Complaint — Milestone 2</div>} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/profile" element={<div className="card p-6 text-gray-400 text-sm text-center">Profile — Milestone 2</div>} />
            </Route>
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
