import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import {
  Users,
  Building,
  Calendar,
  Bell,
  TrendingUp,
  Shield
} from 'lucide-react'

// Enhanced UI components with professional styling
const Card = ({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${hover ? 'hover:scale-[1.02] hover:shadow-2xl' : ''} ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-xl font-bold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 mt-2 ${className}`}>{children}</p>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)
const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) => (
  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${className} ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700' :
    variant === 'success' ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700' :
    variant === 'warning' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700' :
    variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
    'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
  }`}>
    {children}
  </span>
)

const AdminDashboard: React.FC = () => {
  const { user } = useAuth()

  // Only admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.BRANCH_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Only administrators can access this dashboard.</p>
        </div>
      </div>
    )
  }

  // Fetch admin dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      return response.json()
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {}
  const recentActivity = dashboardData?.recentActivity || {}
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  return (
    <div className="space-y-8 min-h-screen">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-2xl blur-3xl"></div>
        <div className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                {isSuperAdmin ? 'Super Admin Dashboard' : 'Branch Admin Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {isSuperAdmin 
                  ? 'Complete system overview and management' 
                  : 'Branch-specific management and analytics'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <Badge variant={isSuperAdmin ? 'destructive' : 'default'} className="text-sm px-4 py-2">
                {isSuperAdmin ? 'Super Admin' : 'Branch Admin'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover className="group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.users?.total || 0}</p>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stats.users?.active || 0} active
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Branches</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.branches?.total || 0}</p>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stats.branches?.active || 0} active
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Bookings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.bookings?.total || 0}</p>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {stats.bookings?.confirmed || 0} confirmed
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Notifications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.notifications?.total || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  System alerts
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Bell className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span>Recent Bookings</span>
            </CardTitle>
            <CardDescription>
              Latest booking activity in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.bookings?.length > 0 ? (
                recentActivity.bookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {booking.student?.name || 'Unknown Student'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {booking.slot?.branch?.name} - {booking.slot?.teacher?.name}
                      </p>
                    </div>
                    <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'warning'}>
                      {booking.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No recent bookings
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span>Recent Users</span>
            </CardTitle>
            <CardDescription>
              Newly registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.users?.length > 0 ? (
                recentActivity.users.slice(0, 5).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md transition-all duration-200">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.role.replace('_', ' ')} - {user.branch?.name || 'No Branch'}
                      </p>
                    </div>
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No recent users
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance (Super Admin only) */}
      {isSuperAdmin && dashboardData?.branchPerformance?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span>Branch Performance</span>
            </CardTitle>
            <CardDescription>
              Performance metrics across all branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Branch</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Users</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Slots</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Bookings</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {dashboardData.branchPerformance.map((branch: any) => (
                    <tr key={branch.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900 dark:text-white">{branch.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="default">{branch.users || 0}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="success">{branch.slots || 0}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="warning">{branch.bookings || 0}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={branch.isActive ? 'success' : 'destructive'}>
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminDashboard
