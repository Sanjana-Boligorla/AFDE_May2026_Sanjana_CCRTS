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
import Dashboard       from './pages/dashboard/Dashboard'
import ComplaintsList  from './pages/complaints/ComplaintsList'
import ComplaintDetail from './pages/complaints/ComplaintDetail'
import CreateComplaint from './pages/complaints/CreateComplaint'
import UserManagement  from './pages/users/UserManagement'
import Categories      from './pages/categories/Categories'
import Reports         from './pages/reports/Reports'
import Profile         from './pages/profile/Profile'
import NotFound        from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public only routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
          </Route>

          {/* Admin + Supervisor */}
          <Route element={<ProtectedRoute allowedRoles={['Admin','Supervisor']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/reports"     element={<Reports />} />
              <Route path="/escalations" element={<Reports />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/users"      element={<UserManagement />} />
              <Route path="/categories" element={<Categories />} />
            </Route>
          </Route>

          {/* Admin + Supervisor + Agent */}
          <Route element={<ProtectedRoute allowedRoles={['Admin','Supervisor','Agent']} />}>
            <Route element={<AppLayout />}>
              <Route path="/complaints"     element={<ComplaintsList />} />
              <Route path="/complaints/:id" element={<ComplaintDetail />} />
            </Route>
          </Route>

          {/* Customer */}
          <Route element={<ProtectedRoute allowedRoles={['Customer']} />}>
            <Route element={<AppLayout />}>
              <Route path="/my-complaints"     element={<ComplaintsList />} />
              <Route path="/my-complaints/:id" element={<ComplaintDetail />} />
              <Route path="/new-complaint"     element={<CreateComplaint />} />
            </Route>
          </Route>

          {/* Shared */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
