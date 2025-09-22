import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Schedule from '@/pages/Schedule-Simple'
import Bookings from '@/pages/Bookings'
import Assessments from '@/pages/Assessments'
import Notifications from '@/pages/Notifications-Simple'
// Admin pages
import AdminSlots from '@/pages/admin/AdminSlots'
import AdminImport from '@/pages/admin/AdminImport'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminReports from '@/pages/admin/AdminReports'
import AdminBranches from '@/pages/admin/AdminBranches'
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Admin Route Component - requires admin role
const AdminRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ 
  children, 
  allowedRoles = [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN] 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="assessments" element={<Assessments />} />
                <Route path="notifications" element={<Notifications />} />
                
                {/* Admin Routes */}
                <Route path="admin/slots" element={
                  <AdminRoute>
                    <AdminSlots />
                  </AdminRoute>
                } />
                <Route path="admin/import" element={
                  <AdminRoute>
                    <AdminImport />
                  </AdminRoute>
                } />
                <Route path="admin/users" element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                } />
                <Route path="admin/reports" element={
                  <AdminRoute>
                    <AdminReports />
                  </AdminRoute>
                } />
                <Route path="admin/branches" element={
                  <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                    <AdminBranches />
                  </AdminRoute>
                } />
                <Route path="admin/settings" element={
                  <AdminRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                    <AdminSettings />
                  </AdminRoute>
                } />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App