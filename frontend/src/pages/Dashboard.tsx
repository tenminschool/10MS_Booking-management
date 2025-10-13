import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardAPI, notificationsAPI, slotsAPI, bookingsAPI } from '@/lib/api'
import NotificationsCarousel from '@/components/NotificationsCarousel'
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
      variant === 'destructive' ? 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' :
      'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
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
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
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
  Star,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { UserRole, BookingStatus, type SlotFilters, type Booking } from '@/types'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Student booking state
  const [activeBookingTab, setActiveBookingTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isTodayCollapsed, setIsTodayCollapsed] = useState(false)
  const [isTomorrowCollapsed, setIsTomorrowCollapsed] = useState(false)

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardAPI.getMetrics(),
    enabled: !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getMy(),
    enabled: !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Teacher-specific data queries
  const teacherFilters: SlotFilters = {
    teacherId: user?.role === UserRole.TEACHER ? user.id : undefined,
    view: 'weekly'
  }

  const { data: teacherSlots } = useQuery({
    queryKey: ['teacher-slots', teacherFilters],
    queryFn: () => slotsAPI.getAvailable(teacherFilters),
    enabled: user?.role === UserRole.TEACHER && !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })


  // Student booking queries
  const { data: studentBookings } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: async () => {
      const response = await bookingsAPI.getMyBookings()
      return (response as any).data
    },
    enabled: user?.role === UserRole.STUDENT && !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (data: { id: string; reason?: string }) => {
      const response = await bookingsAPI.cancel(data.id, data.reason)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsCancelDialogOpen(false)
      setSelectedBooking(null)
      setCancelReason('')
    },
  })

  // Booking helper functions
  const filterBookings = (bookings: any) => {
    const bookingsArray = Array.isArray(bookings) ? bookings : []
    const now = new Date()
    
    console.log('🔍 Filtering bookings:', {
      totalBookings: bookingsArray.length,
      activeTab: activeBookingTab,
      now: now.toISOString(),
      sampleBookings: bookingsArray.slice(0, 3).map(b => ({
        id: b.id,
        status: b.status,
        slotDate: b.slot?.date,
        slotExists: !!b.slot,
        isConfirmed: b.status === BookingStatus.CONFIRMED || b.status === 'CONFIRMED',
        isUpcoming: b.slot && new Date(b.slot.date) >= now
      }))
    })
    
    switch (activeBookingTab) {
      case 'upcoming':
        return bookingsArray.filter(booking => {
          const isConfirmed = booking.status === BookingStatus.CONFIRMED
          const hasSlot = !!booking.slot
          const isUpcoming = hasSlot && new Date(booking.slot.date) >= now
          
          console.log('🔍 Upcoming filter check:', {
            bookingId: booking.id,
            status: booking.status,
            isConfirmed,
            hasSlot,
            isUpcoming,
            slotDate: booking.slot?.date
          })
          
          return isConfirmed && isUpcoming
        })
      case 'past':
        return bookingsArray.filter(booking => {
          const hasSlot = !!booking.slot
          const isPast = hasSlot && new Date(booking.slot.date) < now
          return isPast
        })
      default:
        return bookingsArray
    }
  }

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'default'
      case BookingStatus.COMPLETED:
        return 'secondary'
      case BookingStatus.CANCELLED:
        return 'destructive'
      case BookingStatus.NO_SHOW:
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return <CheckCircle className="w-4 h-4" />
      case BookingStatus.COMPLETED:
        return <GraduationCap className="w-4 h-4" />
      case BookingStatus.CANCELLED:
        return <X className="w-4 h-4" />
      case BookingStatus.NO_SHOW:
        return <AlertCircle className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const handleCancelBooking = () => {
    if (selectedBooking) {
      cancelBookingMutation.mutate({
        id: selectedBooking.id,
        reason: cancelReason || undefined
      })
    }
  }

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const dashboardData = (metrics as any)?.data
  const notificationsData = (notifications as any)?.notifications || (notifications as any)?.data?.notifications || (notifications as any)?.data || []
  const unreadNotifications = notificationsData.filter((n: any) => !n.isRead) || []
  

  // Teacher-specific data processing
  const todaySlots = (teacherSlots as any)?.data?.filter((slot: any) => 
    isToday(new Date(slot.date))
  ) || []
  
  const tomorrowSlots = (teacherSlots as any)?.data?.filter((slot: any) => 
    isTomorrow(new Date(slot.date))
  ) || []

  // Student booking data
  const allStudentBookings = Array.isArray(studentBookings) ? studentBookings : []
  const filteredStudentBookings = filterBookings(allStudentBookings)
  
  // Debug logging
  console.log('🔍 Dashboard Debug - Student Bookings:', {
    allStudentBookings: allStudentBookings.length,
    filteredStudentBookings: filteredStudentBookings.length,
    activeBookingTab,
    sampleBooking: allStudentBookings[0] ? {
      id: allStudentBookings[0].id,
      status: allStudentBookings[0].status,
      slotDate: allStudentBookings[0].slot?.date,
      slotExists: !!allStudentBookings[0].slot
    } : null
  })

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
                    {dashboardData.upcomingBookings.slice(0, 8).map((booking: Booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                              {booking.slot?.startTime} - {booking.slot?.endTime}
                            </span>
                            <Badge variant={booking.status === BookingStatus.CONFIRMED ? 'default' : 'secondary'}>
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
            <NotificationsCarousel 
              notifications={notificationsData || []}
              unreadCount={unreadNotifications.length}
            />
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
            <NotificationsCarousel 
              notifications={notificationsData || []}
              unreadCount={unreadNotifications.length}
            />
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
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-800 dark:via-purple-800 dark:to-indigo-900 rounded-2xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome back, {user?.name}! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  {todaySlots.length > 0 
                    ? `You have ${todaySlots.length} speaking test session${todaySlots.length > 1 ? 's' : ''} scheduled for today`
                    : "No sessions scheduled for today - enjoy your free time!"}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Moved below welcome section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-800 dark:text-orange-200">Today's Sessions</CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{todaySlots.length}</div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Speaking tests scheduled</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-200">Students Today</CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {todaySlots.reduce((sum: number, slot: any) => sum + (slot.bookedCount || 0), 0)}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Students to assess</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-800 dark:text-purple-200">This Week</CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{(teacherSlots as any)?.data?.length || 0}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total sessions scheduled</p>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* PRIMARY CONTENT - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Sessions */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-b border-orange-100 dark:border-orange-800/30">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">Today's Speaking Tests</span>
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mt-1">
                        Your scheduled assessment sessions for today
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTodayCollapsed(!isTodayCollapsed)}
                    className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {isTodayCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {!isTodayCollapsed && (
                <CardContent>
                  {todaySlots.length > 0 ? (
                    <div className="space-y-4">
                      {todaySlots.map((slot: any) => (
                        <div key={slot.id} className="group relative overflow-hidden bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500">
                          <div className="flex items-center justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                  <Badge className="ml-3 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                                    {slot.bookedCount}/{slot.capacity} students enrolled
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                                <MapPin className="w-4 h-4" />
                                <span className="font-medium">{slot.branch?.name}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link to={`/bookings?slot=${slot.id}`}>
                                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
                                  <Users className="w-4 h-4 mr-2" />
                                  Manage Students
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Sessions Today</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You have a free day! Take some time to relax or prepare for upcoming sessions.
                      </p>
                      <Link to="/schedule">
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
                          <Calendar className="w-4 h-4 mr-2" />
                          View Full Schedule
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Tomorrow's Preview */}
            {tomorrowSlots.length > 0 && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-100 dark:border-green-800/30">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Tomorrow's Schedule</span>
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                          Preview of your upcoming assessment sessions
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsTomorrowCollapsed(!isTomorrowCollapsed)}
                      className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isTomorrowCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {!isTomorrowCollapsed && (
                  <CardContent>
                    <div className="space-y-3">
                      {tomorrowSlots.slice(0, 3).map((slot: any) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Users className="w-4 h-4" />
                              <span>{slot.bookedCount || 0} students booked</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {tomorrowSlots.length > 3 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          +{tomorrowSlots.length - 3} more sessions
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

          </div>

          {/* SECONDARY CONTENT - 1/3 width */}
          <div className="space-y-6">
            {/* Recent Notifications */}
            <NotificationsCarousel 
              notifications={notificationsData || []}
              unreadCount={unreadNotifications.length}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header - Beautiful Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-800 dark:via-purple-800 dark:to-indigo-900 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                Ready to ace your IELTS speaking test? Let's check your progress!
              </p>
            </div>
            {user?.role === UserRole.STUDENT && (
              <Link to="/schedule">
                <Button className="bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold">
                  <Plus className="w-5 h-5 mr-2" />
                  Book Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Beautiful Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">Total Bookings</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{allStudentBookings.length}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">All time</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">Completed</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {allStudentBookings.filter((b: Booking) => 
                    b.status === BookingStatus.COMPLETED
                  ).length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Tests taken</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-3">Upcoming</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {allStudentBookings.filter((b: Booking) => 
                    b.status === BookingStatus.CONFIRMED &&
                    b.slot && new Date(b.slot.date) >= new Date()
                  ).length}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Scheduled</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3">Attendance Rate</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {(() => {
                    const completedBookings = allStudentBookings.filter((b: Booking) => 
                      b.status === BookingStatus.COMPLETED
                    );
                    const attendedBookings = completedBookings.filter((b: Booking) => b.attended === true);
                    return completedBookings.length > 0 ? `${Math.round((attendedBookings.length / completedBookings.length) * 100)}%` : '0%';
                  })()}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Overall</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">

          {/* Booking Management Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <Button
              variant={activeBookingTab === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveBookingTab('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={activeBookingTab === 'past' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveBookingTab('past')}
            >
              Past
            </Button>
            <Button
              variant={activeBookingTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveBookingTab('all')}
            >
              All
            </Button>
          </div>

          {/* Bookings List - Beautiful Design */}
          {filteredStudentBookings.length > 0 ? (
            filteredStudentBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
                <CardContent className="p-0">
                  {/* Header with Status */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {booking.slot?.date && format(new Date(booking.slot.date), 'EEEE, MMMM dd, yyyy')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.slot?.startTime} - {booking.slot?.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant={getStatusColor(booking.status)} className="flex items-center space-x-1 text-xs px-2 py-1">
                        {getStatusIcon(booking.status)}
                        <span>{booking.status}</span>
                      </Badge>
                      {/* Cancel Button - Positioned below status */}
                      {booking.status === BookingStatus.CONFIRMED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking)
                            setIsCancelDialogOpen(true)
                          }}
                          className="flex items-center space-x-1 text-xs px-2 py-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Main Content - More Compact */}
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Teacher Info */}
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                          <User className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Instructor
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {booking.slot?.teacher?.name || 'TBD'}
                          </p>
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                          <MapPin className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Location
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {booking.slot?.branch?.name || 'TBD'}
                          </p>
                        </div>
                      </div>

                      {/* Room Info */}
                      <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <Building className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Room
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {booking.slot?.roomNumber || 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeBookingTab === 'upcoming' ? 'No upcoming bookings' :
                    activeBookingTab === 'past' ? 'No past bookings' : 'No bookings found'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {activeBookingTab === 'upcoming' ? 'Book your first speaking test to get started' :
                    'Your booking history will appear here'}
                </p>
                {activeBookingTab === 'upcoming' && (
                  <Link to="/schedule">
                    <Button>Book Your First Test</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* SECONDARY CONTENT - 1/3 width */}
        <div className="space-y-6">
          {/* Recent Notifications */}
          <NotificationsCarousel 
            notifications={notificationsData || []}
            unreadCount={unreadNotifications.length}
          />
        </div>
      </div>

      {/* Cancel Booking Dialog */}
      {isCancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setIsCancelDialogOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Cancel Booking</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="Please provide a reason for cancellation..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsCancelDialogOpen(false)}
                    className="flex-1"
                  >
                    Keep Booking
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelBooking}
                    disabled={cancelBookingMutation.isPending}
                    className="flex-1"
                  >
                    {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

export default Dashboard