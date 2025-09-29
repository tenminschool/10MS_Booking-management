import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/components/ui/toast'
import ErrorBoundary from '@/components/ErrorBoundary'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Schedule from '@/pages/Schedule'
import Bookings from '@/pages/Bookings'
import Assessments from '@/pages/Assessments'
import Profile from '@/pages/Profile'
// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminSlots from '@/pages/admin/AdminSlots'
import AdminBranches from '@/pages/admin/AdminBranches'
import AdminTeachers from '@/pages/admin/AdminTeachers'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminBookings from '@/pages/admin/AdminBookings'
import AdminAssessments from '@/pages/admin/AdminAssessments'
import AdminNotifications from '@/pages/admin/AdminNotifications'
import AdminSettings from '@/pages/admin/AdminSettings'
import { UserRole } from '@/types'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Debug logging (reduced)
  // console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user)

  if (isLoading) {
    // console.log('ProtectedRoute - showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // console.log('ProtectedRoute - redirecting to login')
    return <Navigate to="/login" replace />
  }

  // console.log('ProtectedRoute - rendering protected content')
  return <>{children}</>
}

// Admin Route Component - requires admin role
const AdminRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Debug logging
  console.log('AdminRoute - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user)
  console.log('AdminRoute - allowedRoles:', allowedRoles)
  console.log('AdminRoute - user role:', user?.role)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('AdminRoute - Not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    console.log('AdminRoute - Access denied. User role:', user?.role, 'Allowed roles:', allowedRoles)
    return <Navigate to="/dashboard" replace />
  }

  console.log('AdminRoute - Access granted')
  return <>{children}</>
}

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  console.log('PublicRoute - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user)

  if (isLoading) {
    console.log('PublicRoute - showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    console.log('PublicRoute - redirecting to home (user is authenticated)')
    // This will be handled by the main App component
    return <Navigate to="/" replace />
  }

  console.log('PublicRoute - rendering public content (login page)')
  return <>{children}</>
}

// Redirect to dashboard component
const RedirectToDashboard: React.FC = () => {
  const { user, isLoading } = useAuth()
  
  console.log('RedirectToDashboard - user:', user, 'isLoading:', isLoading)
  
  if (isLoading) {
    console.log('RedirectToDashboard - showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }
  
  if (!user) {
    console.log('RedirectToDashboard - redirecting to login (no user)')
    return <Navigate to="/login" replace />
  }
  
  console.log('RedirectToDashboard - redirecting to dashboard')
  // All users go to the same dashboard page, but dashboard renders differently based on role
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Router>
                <div className="min-h-screen bg-background text-foreground">
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<RedirectToDashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="schedule" element={<Schedule />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="assessments" element={<Assessments />} />
                    <Route path="profile" element={<Profile />} />

                    {/* Admin Routes - Professional URL Structure */}
                    <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="admin/dashboard" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]}>
                        <AdminDashboard />
                      </AdminRoute>
                    } />
                    <Route path="admin/slots" element={
                      <AdminRoute>
                        <AdminSlots />
                      </AdminRoute>
                    } />
                    <Route path="admin/branches" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminBranches />
                      </AdminRoute>
                    } />
                    <Route path="admin/teachers" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminTeachers />
                      </AdminRoute>
                    } />
                    <Route path="admin/users" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminUsers />
                      </AdminRoute>
                    } />
                    <Route path="admin/bookings" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminBookings />
                      </AdminRoute>
                    } />
                    <Route path="admin/assessments" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminAssessments />
                      </AdminRoute>
                    } />
                    <Route path="admin/notifications" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminNotifications />
                      </AdminRoute>
                    } />
                    <Route path="admin/settings" element={
                      <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <AdminSettings />
                      </AdminRoute>
                    } />
                    
                    {/* Future Admin Routes - TODO: Implement these pages */}
                    {/* <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} /> */}
                    {/* <Route path="admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} /> */}
                    {/* <Route path="admin/import" element={<AdminRoute><AdminImport /></AdminRoute>} /> */}
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                </div>
              </Router>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App