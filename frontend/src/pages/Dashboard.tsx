import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardAPI, notificationsAPI, slotsAPI, bookingsAPI } from '@/lib/api'
// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 pb-3 sm:pb-4 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{children}</p>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 pt-0 ${className}`}>{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      'bg-blue-600 text-white hover:bg-blue-700'
    } ${size === 'sm' ? 'px-2 sm:px-3 py-1 text-xs sm:text-sm' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
)
const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  } ${className}`}>
    {children}
  </span>
)
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Bell, 
  BookOpen, 
  GraduationCap,
  Plus,
  AlertCircle,
  Users,
  CheckCircle,
  FileText,
  Sliders,
  Upload,
  BarChart3,
  Building,
  XCircle,
  AlertTriangle,
  Star
} from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { UserRole, type SlotFilters } from '@/types'

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardAPI.getMetrics(),
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getMy(),
  })

  // Teacher-specific data queries
  const teacherFilters: SlotFilters = {
    teacherId: user?.role === UserRole.TEACHER ? user.id : undefined,
    view: 'weekly'
  }

  const { data: teacherSlots } = useQuery({
    queryKey: ['teacher-slots', teacherFilters],
    queryFn: () => slotsAPI.getAvailable(teacherFilters),
    enabled: user?.role === UserRole.TEACHER
  })

  const { data: teacherBookings } = useQuery({
    queryKey: ['teacher-bookings'],
    queryFn: () => bookingsAPI.getMyBookings(),
    enabled: user?.role === UserRole.TEACHER
  })

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const dashboardData = metrics?.data
  const unreadNotifications = (notifications?.data?.notifications || notifications?.data || []).filter((n: any) => !n.isRead) || []

  // Teacher-specific data processing
  const todaySlots = teacherSlots?.data?.filter((slot: any) => 
    isToday(new Date(slot.date))
  ) || []
  
  const tomorrowSlots = teacherSlots?.data?.filter((slot: any) => 
    isTomorrow(new Date(slot.date))
  ) || []

  const todayBookings = teacherBookings?.data?.filter((booking: any) => 
    booking.slot && isToday(new Date(booking.slot.date))
  ) || []

  // Render branch admin dashboard
  if (user?.role === UserRole.BRANCH_ADMIN) {
    return (
      <div className="space-y-6">
        {/* Welcome Header - Simplified */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Branch overview for {dashboardData?.branchName || 'your branch'}
            </p>
          </div>
          <Link to="/admin/slots">
            <Button className="bg-red-600 hover:bg-red-700">
              <Sliders className="w-4 h-4 mr-2" />
              Manage Slots
            </Button>
          </Link>
        </div>

        {/* Stats Cards - Horizontal Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalBookings || 0}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.attendanceRate ? `${Math.round(dashboardData.attendanceRate)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">Overall</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.averageScore ? dashboardData.averageScore.toFixed(1) : '0.0'}
              </div>
              <p className="text-xs text-muted-foreground">Out of 10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilization</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.utilizationRate ? `${Math.round(dashboardData.utilizationRate)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">Slot usage</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PRIMARY CONTENT - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Sessions Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Today's Sessions</span>
                </CardTitle>
                <CardDescription>
                  Overview of all sessions in your branch today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.upcomingBookings?.length ? (
                  <div className="space-y-4">
                    {dashboardData.upcomingBookings.slice(0, 8).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {booking.slot?.startTime} - {booking.slot?.endTime}
                            </span>
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{booking.slot?.teacher?.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{booking.student?.name}</span>
                            </div>
                          </div>
                        </div>
                        <Link to={`/bookings?booking=${booking.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    <Link to="/bookings">
                      <Button variant="outline" className="w-full">
                        View All Sessions
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No sessions scheduled for today</p>
                    <Link to="/admin/slots">
                      <Button>Create Slots</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Link to="/admin/slots">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Sliders className="w-6 h-6" />
                      <span>Manage Slots</span>
                    </Button>
                  </Link>
                  <Link to="/admin/import">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Upload className="w-6 h-6" />
                      <span>Import Students</span>
                    </Button>
                  </Link>
                  <Link to="/admin/users">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Users className="w-6 h-6" />
                      <span>Manage Users</span>
                    </Button>
                  </Link>
                  <Link to="/admin/reports">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <BarChart3 className="w-6 h-6" />
                      <span>View Reports</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECONDARY CONTENT - 1/3 width */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.totalBookings || 0}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData?.attendanceRate ? `${Math.round(dashboardData.attendanceRate)}%` : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground">Branch average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilization</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData?.utilizationRate ? `${Math.round(dashboardData.utilizationRate)}%` : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground">Slot efficiency</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentNotifications?.length ? (
                  <div className="space-y-3">
                    {dashboardData.recentNotifications.slice(0, 3).map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-lg border text-sm ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`p-1 rounded-full ${
                            notification.type === 'booking_confirmed' ? 'bg-green-100 dark:bg-green-900/20' :
                            notification.type === 'booking_reminder' ? 'bg-yellow-100' :
                            notification.type === 'booking_cancelled' ? 'bg-red-100 dark:bg-red-900/20' :
                            'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                            {notification.type === 'booking_confirmed' ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : notification.type === 'booking_reminder' ? (
                              <Clock className="w-3 h-3 text-yellow-600" />
                            ) : notification.type === 'booking_cancelled' ? (
                              <AlertCircle className="w-3 h-3 text-red-600" />
                            ) : (
                              <Bell className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/notifications">
                      <Button variant="outline" size="sm" className="w-full">
                        View All
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Render super admin dashboard
  if (user?.role === UserRole.SUPER_ADMIN) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                System Overview - Welcome, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                Cross-branch metrics and system-wide analytics
              </p>
            </div>
            <div className="flex space-x-3">
              <Link to="/admin/branches">
                <Button className="bg-red-600 hover:bg-red-700">
                  <Building className="w-4 h-4 mr-2" />
                  Manage Branches
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button variant="outline">
                  <Sliders className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* System-wide Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalBranches || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData?.activeBranches || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Bookings</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalBookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                This month across all branches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.attendanceRate ? `${Math.round(dashboardData.attendanceRate)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">System average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.utilizationRate ? `${Math.round(dashboardData.utilizationRate)}%` : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">Slot efficiency</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PRIMARY CONTENT - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Branch Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Branch Performance</span>
                </CardTitle>
                <CardDescription>
                  Comparative metrics across all branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.branchPerformance?.length ? (
                  <div className="space-y-4">
                    {dashboardData.branchPerformance.map((branch: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{branch.name}</span>
                            <Badge variant={branch.utilizationRate > 80 ? 'success' : branch.utilizationRate > 60 ? 'warning' : 'destructive'}>
                              {Math.round(branch.utilizationRate)}% utilization
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <BookOpen className="w-4 h-4" />
                              <span>{branch.bookings} bookings</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{branch.students} students</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <GraduationCap className="w-4 h-4" />
                              <span>{Math.round(branch.attendanceRate || 0)}% attendance</span>
                            </div>
                          </div>
                        </div>
                        <Link to={`/admin/reports?branch=${branch.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No branch performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System-wide Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent System Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest bookings and activities across all branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentActivity?.length ? (
                  <div className="space-y-4">
                    {dashboardData.recentActivity.slice(0, 8).map((activity: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1 rounded-full ${
                              activity.type === 'booking' ? 'bg-green-100 dark:bg-green-900/20' :
                              activity.type === 'cancellation' ? 'bg-red-100 dark:bg-red-900/20' :
                              activity.type === 'assessment' ? 'bg-blue-100 dark:bg-blue-900/20' :
                              'bg-gray-100 dark:bg-gray-700'
                            }`}>
                              {activity.type === 'booking' ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : activity.type === 'cancellation' ? (
                                <XCircle className="w-3 h-3 text-red-600" />
                              ) : activity.type === 'assessment' ? (
                                <FileText className="w-3 h-3 text-blue-600" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-gray-600" />
                              )}
                            </div>
                            <span className="font-medium">{activity.description}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Building className="w-4 h-4" />
                              <span>{activity.branchName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(activity.timestamp), 'MMM dd, h:mm a')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/admin/reports">
                      <Button variant="outline" className="w-full">
                        View All Activity
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Administration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <Link to="/admin/branches">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Building className="w-6 h-6" />
                      <span>Branches</span>
                    </Button>
                  </Link>
                  <Link to="/admin/users">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Users className="w-6 h-6" />
                      <span>All Users</span>
                    </Button>
                  </Link>
                  <Link to="/admin/reports">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <BarChart3 className="w-6 h-6" />
                      <span>System Reports</span>
                    </Button>
                  </Link>
                  <Link to="/admin/settings">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Sliders className="w-6 h-6" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECONDARY CONTENT - 1/3 width */}
          <div className="space-y-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <Badge variant="success">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">SMS Service</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Notifications</span>
                    <Badge variant="success">Running</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Audit Logs</span>
                    <Badge variant="success">Recording</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>System Alerts</span>
                  {dashboardData?.systemAlerts?.length > 0 && (
                    <Badge variant="warning">
                      {dashboardData.systemAlerts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.systemAlerts?.length ? (
                  <div className="space-y-3">
                    {dashboardData.systemAlerts.slice(0, 3).map((alert: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-yellow-800">{alert.title}</p>
                            <p className="text-xs text-yellow-700 mt-1">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No system alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentNotifications?.length ? (
                  <div className="space-y-3">
                    {dashboardData.recentNotifications.slice(0, 3).map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-lg border text-sm ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`p-1 rounded-full ${
                            notification.type === 'system_alert' ? 'bg-red-100 dark:bg-red-900/20' :
                            notification.type === 'booking_confirmed' ? 'bg-green-100 dark:bg-green-900/20' :
                            'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                            {notification.type === 'system_alert' ? (
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                            ) : notification.type === 'booking_confirmed' ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <Bell className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/notifications">
                      <Button variant="outline" size="sm" className="w-full">
                        View All
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Render teacher-specific dashboard
  if (user?.role === UserRole.TEACHER) {
    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-1">
                {todaySlots.length > 0 
                  ? `You have ${todaySlots.length} session${todaySlots.length > 1 ? 's' : ''} today`
                  : "No sessions scheduled for today"}
              </p>
            </div>
            <Link to="/schedule">
              <Button className="bg-red-600 hover:bg-red-700">
                <Calendar className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
            </Link>
          </div>
        </div>

        {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PRIMARY CONTENT - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Today's Sessions</span>
                </CardTitle>
                <CardDescription>
                  Your scheduled speaking tests for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todaySlots.length > 0 ? (
                  <div className="space-y-4">
                    {todaySlots.map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Badge variant="outline">
                              {slot.bookedCount}/{slot.capacity} students
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{slot.branch?.name}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/bookings?slot=${slot.id}`}>
                            <Button variant="outline" size="sm">
                              <Users className="w-4 h-4 mr-2" />
                              View Students
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No sessions scheduled for today</p>
                    <Link to="/schedule">
                      <Button variant="outline">View Full Schedule</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tomorrow's Preview */}
            {tomorrowSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Tomorrow's Sessions</span>
                  </CardTitle>
                  <CardDescription>
                    Preview of your upcoming sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tomorrowSlots.slice(0, 3).map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{slot.bookedCount} students booked</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tomorrowSlots.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{tomorrowSlots.length - 3} more sessions
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Link to="/bookings">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <Users className="w-6 h-6" />
                      <span>My Sessions</span>
                    </Button>
                  </Link>
                  <Link to="/assessments">
                    <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                      <FileText className="w-6 h-6" />
                      <span>Record Scores</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECONDARY CONTENT - 1/3 width */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todaySlots.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Students Today</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {todaySlots.reduce((sum: number, slot: any) => sum + slot.bookedCount, 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teacherSlots?.data?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total slots</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadNotifications.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentNotifications?.length ? (
                  <div className="space-y-3">
                    {dashboardData.recentNotifications.slice(0, 3).map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-lg border text-sm ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <div className={`p-1 rounded-full ${
                            notification.type === 'booking_confirmed' ? 'bg-green-100 dark:bg-green-900/20' :
                            notification.type === 'booking_reminder' ? 'bg-yellow-100' :
                            notification.type === 'booking_cancelled' ? 'bg-red-100 dark:bg-red-900/20' :
                            'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                            {notification.type === 'booking_confirmed' ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : notification.type === 'booking_reminder' ? (
                              <Clock className="w-3 h-3 text-yellow-600" />
                            ) : notification.type === 'booking_cancelled' ? (
                              <AlertCircle className="w-3 h-3 text-red-600" />
                            ) : (
                              <Bell className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/notifications">
                      <Button variant="outline" size="sm" className="w-full">
                        View All
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      {/* Welcome Header - Simplified */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name}!
        </h1>
        {user?.role === UserRole.STUDENT && (
          <Link to="/schedule">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Book Now
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards - Horizontal Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.attendanceRate ? `${Math.round(dashboardData.attendanceRate)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Overall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.averageScore ? dashboardData.averageScore.toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">Out of 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.upcomingBookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Bookings - Primary Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Upcoming Bookings</span>
              </CardTitle>
              <CardDescription>
                Your next scheduled speaking tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.upcomingBookings?.length ? (
                <div className="space-y-4">
                  {dashboardData.upcomingBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-sm text-gray-600">
                            {booking.slot?.startTime} - {booking.slot?.endTime}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{booking.slot?.teacher?.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{booking.slot?.branch?.name}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                  <Link to="/bookings">
                    <Button variant="outline" className="w-full">
                      View All Bookings
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No upcoming bookings</p>
                  <Link to="/schedule">
                    <Button>Book Your First Test</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Book Section - Primary Content */}
          {user?.role === UserRole.STUDENT && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Quick Book</span>
                </CardTitle>
                <CardDescription>
                  Find and book your next speaking test
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Link to="/schedule">
                      <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                        <Calendar className="w-6 h-6" />
                        <span>Browse Slots</span>
                      </Button>
                    </Link>
                    <Link to="/schedule?view=today">
                      <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                        <Clock className="w-6 h-6" />
                        <span>Today's Slots</span>
                      </Button>
                    </Link>
                  </div>
                  <Link to="/schedule">
                    <Button className="w-full bg-red-600 hover:bg-red-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Book New Test
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SECONDARY CONTENT - 1/3 width */}
        <div className="space-y-6">

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
                {unreadNotifications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentNotifications?.length ? (
                <div className="space-y-3">
                  {dashboardData.recentNotifications.slice(0, 3).map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-3 rounded-lg border text-sm ${
                        !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <div className={`p-1 rounded-full ${
                          notification.type === 'booking_confirmed' ? 'bg-green-100' :
                          notification.type === 'booking_reminder' ? 'bg-yellow-100' :
                          notification.type === 'booking_cancelled' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          {notification.type === 'booking_confirmed' ? (
                            <BookOpen className="w-3 h-3 text-green-600" />
                          ) : notification.type === 'booking_reminder' ? (
                            <Clock className="w-3 h-3 text-yellow-600" />
                          ) : notification.type === 'booking_cancelled' ? (
                            <AlertCircle className="w-3 h-3 text-red-600" />
                          ) : (
                            <Bell className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link to="/notifications">
                    <Button variant="outline" size="sm" className="w-full">
                      View All
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {user?.role === UserRole.STUDENT && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link to="/bookings">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <BookOpen className="w-4 h-4 mr-2" />
                      My Bookings
                    </Button>
                  </Link>
                  <Link to="/assessments">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      My Scores
                    </Button>
                  </Link>
                  <Link to="/notifications">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Bell className="w-4 h-4 mr-2" />
                      Notifications
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>


    </div>
  )
}

export default Dashboard