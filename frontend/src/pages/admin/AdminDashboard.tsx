import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import {
  Users,
  Building,
  Calendar,
  Bell,
  BarChart3,
  TrendingUp,
  Shield,
  Crown,
  GraduationCap,
  UserCog
} from 'lucide-react'

// Mock UI components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{children}</p>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
    variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
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
    <div className="space-y-6 bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Branch Admin Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin 
              ? 'Complete system overview and management' 
              : 'Branch-specific management and analytics'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Badge variant={isSuperAdmin ? 'destructive' : 'default'}>
            {isSuperAdmin ? 'Super Admin' : 'Branch Admin'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users?.total || 0}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.users?.active || 0} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Branches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.branches?.total || 0}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.branches?.active || 0} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bookings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.bookings?.total || 0}</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {stats.bookings?.confirmed || 0} confirmed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Notifications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.notifications?.total || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  System alerts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Role Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>User Distribution</span>
            </CardTitle>
            <CardDescription>
              Breakdown of users by role and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserCog className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Students</span>
                </div>
                <Badge variant="warning">{stats.users?.students || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Teachers</span>
                </div>
                <Badge variant="success">{stats.users?.teachers || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch Admins</span>
                </div>
                <Badge variant="default">{stats.users?.branchAdmins || 0}</Badge>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Super Admins</span>
                  </div>
                  <Badge variant="destructive">{stats.users?.superAdmins || 0}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Recent Bookings</span>
            </CardTitle>
            <CardDescription>
              Latest booking activity in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.bookings?.length > 0 ? (
                recentActivity.bookings.slice(0, 5).map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent bookings
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Recent Users</span>
            </CardTitle>
            <CardDescription>
              Newly registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.users?.length > 0 ? (
                recentActivity.users.slice(0, 5).map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent users
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance (Super Admin only) */}
      {isSuperAdmin && dashboardData?.branchPerformance?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Branch Performance</span>
            </CardTitle>
            <CardDescription>
              Performance metrics across all branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Branch</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Users</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Slots</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Bookings</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.branchPerformance.map((branch: any) => (
                    <tr key={branch.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{branch.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{branch.address}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default">{branch.users || 0}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success">{branch.slots || 0}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="warning">{branch.bookings || 0}</Badge>
                      </td>
                      <td className="py-3 px-4">
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
