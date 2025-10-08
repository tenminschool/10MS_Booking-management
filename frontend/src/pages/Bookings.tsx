import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookingsAPI, dashboardAPI, branchesAPI, serviceTypesAPI } from '@/lib/api'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  X,
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  FileText,
  Search,
  Filter,
  ChevronDown,
  RefreshCw
} from 'lucide-react'

// Enhanced UI Components
interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>{children}</div>
)

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pb-4">{children}</div>
)

const CardTitle: React.FC<CardTitleProps> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)

const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button
    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl' :
      variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300' :
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
    } ${size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3 text-lg' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    disabled={disabled}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
)

const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
      'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
    } ${className}`}>
    {children}
  </span>
)

const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  ) : null
)

const DialogContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
)

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{children}</h2>
)

const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{children}</p>
)

const Bookings: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  
  // Enhanced filtering and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedServiceType, setSelectedServiceType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)


  const isTeacher = user?.role === UserRole.TEACHER
  console.log('🔍 User context:', { user, isTeacher, userRole: user?.role });

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      return (response as any).branches || []
    },
  })

  // Fetch service types for filter
  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const response = await serviceTypesAPI.getAll()
      return (response as any).data
    },
  })

  // Fetch bookings - different endpoints for different roles
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['bookings', isTeacher ? 'teacher' : 'student'],
    queryFn: async () => {
      console.log('🔍 Bookings query - isTeacher:', isTeacher, 'user:', user);
      const response = isTeacher 
        ? await bookingsAPI.getTeacherBookings() 
        : await bookingsAPI.getMyBookings()
      console.log('🔍 Bookings API response:', response);
      console.log('🔍 Bookings API response.data:', (response as any).data);
      
      // Handle different API response structures
      const apiData = (response as any).data
      let bookingsData
      
      if (isTeacher) {
        // Teacher endpoint returns: { data: [...], count: ... }
        bookingsData = apiData?.data || []
      } else {
        // Student endpoint returns: { bookings: [...], pagination: {...} }
        bookingsData = apiData?.bookings || []
      }
      
      console.log('🔍 Processed bookings data:', {
        isTeacher,
        apiData,
        bookingsData,
        bookingsDataLength: Array.isArray(bookingsData) ? bookingsData.length : 'not array'
      });
      
      return bookingsData
    },
    enabled: !!user, // Only run query when user is available
  })

  // Fetch dashboard data for stats
  const { data: dashboardData, error: dashboardError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      console.log('🔍 Dashboard query - user:', user);
      const response = await dashboardAPI.getMetrics()
      console.log('🔍 Dashboard API response:', response);
      return (response as any).data
    },
    enabled: !!user, // Only run query when user is available
  })

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (data: { id: string; reason?: string }) => {
      const response = await bookingsAPI.cancel(data.id, data.reason)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsCancelDialogOpen(false)
      setSelectedBooking(null)
      setCancelReason('')
    },
  })

  const handleCancelBooking = () => {
    if (selectedBooking) {
      cancelBookingMutation.mutate({
        id: selectedBooking.id,
        reason: cancelReason || undefined
      })
    }
  }

  // Enhanced filtering with search and multiple criteria
  const filteredBookings = useMemo(() => {
    // Ensure bookings is an array
    const bookingsArray = Array.isArray(bookings) ? bookings : []
    console.log('🔍 Filtering bookings:', { 
      total: bookingsArray.length, 
      activeTab,
      searchQuery,
      selectedBranch,
      selectedServiceType,
      selectedStatus,
      sampleBooking: bookingsArray[0] ? {
        id: bookingsArray[0].id,
        status: bookingsArray[0].status,
        slotDate: bookingsArray[0].slot?.date
      } : null
    });
    
    let filtered = bookingsArray

    // Apply tab filter first
    const now = new Date()
    switch (activeTab as 'all' | 'upcoming' | 'past') {
      case 'upcoming':
        filtered = filtered.filter(booking =>
          booking.slot && new Date(booking.slot.date) >= now
        )
        break
      case 'past':
        filtered = filtered.filter(booking =>
          booking.slot && new Date(booking.slot.date) < now
        )
        break
      default:
        // 'all' - no date filtering
        break
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(booking => {
        const studentName = booking.student?.name?.toLowerCase() || ''
        const teacherName = booking.slot?.teacher?.name?.toLowerCase() || ''
        const branchName = booking.slot?.branch?.name?.toLowerCase() || ''
        const serviceTypeName = booking.slot?.serviceType?.name?.toLowerCase() || ''
        const roomName = booking.slot?.room?.roomName?.toLowerCase() || ''
        const roomNumber = booking.slot?.room?.roomNumber?.toLowerCase() || ''
        const startTime = booking.slot?.startTime?.toLowerCase() || ''
        const endTime = booking.slot?.endTime?.toLowerCase() || ''
        const date = booking.slot?.date ? format(new Date(booking.slot.date), 'MMMM dd, yyyy').toLowerCase() : ''
        
        return studentName.includes(query) ||
               teacherName.includes(query) ||
               branchName.includes(query) ||
               serviceTypeName.includes(query) ||
               roomName.includes(query) ||
               roomNumber.includes(query) ||
               startTime.includes(query) ||
               endTime.includes(query) ||
               date.includes(query)
      })
    }

    // Apply branch filter
    if (selectedBranch) {
      filtered = filtered.filter(booking => booking.slot?.branch?.id === selectedBranch)
    }

    // Apply service type filter
    if (selectedServiceType) {
      filtered = filtered.filter(booking => booking.slot?.serviceType?.id === selectedServiceType)
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered.filter(booking => booking.status === selectedStatus)
    }

    return filtered
  }, [bookings, activeTab, searchQuery, selectedBranch, selectedServiceType, selectedStatus])

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'success'
      case BookingStatus.COMPLETED:
        return 'default'
      case BookingStatus.CANCELLED:
        return 'destructive'
      case BookingStatus.NO_SHOW:
        return 'warning'
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

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedBranch('')
    setSelectedServiceType('')
    setSelectedStatus('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading bookings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('❌ Bookings query error:', error);
  }

  if (dashboardError) {
    console.error('❌ Dashboard query error:', dashboardError);
  }

  // Handle both array and object response structures
  let allBookings = []
  if (Array.isArray(bookings)) {
    allBookings = bookings
  } else if (bookings && typeof bookings === 'object') {
    // If bookings is an object, check for common array properties
    allBookings = bookings.data || bookings.bookings || bookings.results || []
  }
  
  console.log('🔍 Bookings data:', { 
    bookings, 
    bookingsType: typeof bookings,
    bookingsIsArray: Array.isArray(bookings),
    allBookings: allBookings.length, 
    isTeacher,
    sampleBooking: allBookings[0] || null
  });
  
  console.log('🔍 Filtered bookings:', filteredBookings.length);
  
  // Get upcoming bookings based on role
  const upcomingBookings = isTeacher 
    ? (dashboardData as any)?.upcomingSlots || []
    : (dashboardData as any)?.upcomingBookings || []
  console.log('🔍 Upcoming bookings:', upcomingBookings.length);

  const breadcrumbItems = [
    { label: 'Bookings', current: true }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbItems} />
      
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {isTeacher ? 'My Teaching Sessions' : 'My Bookings'}
          </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
            {isTeacher
                  ? 'Manage your teaching sessions and mark student attendance'
                  : 'Manage your speaking test bookings and track your progress'}
          </p>
        </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['bookings'] })}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
        {!isTeacher && (
          <Link to="/schedule">
                  <Button size="lg" className="flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Book New Test</span>
            </Button>
          </Link>
        )}
            </div>
          </div>
      </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-3">Total {isTeacher ? 'Sessions' : 'Bookings'}</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{allBookings.length}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-lg flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-3">Completed</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {allBookings.filter((b: Booking) => b.status === BookingStatus.COMPLETED).length}
                  </p>
                </div>
                <div className="p-3 bg-green-500 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-3">Upcoming</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {allBookings.filter((b: Booking) => b.status === BookingStatus.CONFIRMED).length}
                  </p>
                </div>
                <div className="p-3 bg-orange-500 rounded-lg flex-shrink-0">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {(dashboardData as any)?.attendanceRate ?
                      `${Math.round((dashboardData as any).attendanceRate)}%` : '0%'}
                  </p>
                </div>
                <div className="p-3 bg-purple-500 rounded-lg flex-shrink-0">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filter Section */}
        <div className="space-y-6 mb-8">
          {/* Search and Quick Filters */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardContent className="p-6 py-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                {/* Search Bar */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name, date, time, branch..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Quick Filter Tabs */}
                <div className="flex items-center space-x-2">
                  <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <Button
                      variant={activeTab === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('all')}
                      className="px-4"
                    >
                      All
                    </Button>
        <Button
          variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('upcoming')}
                      className="px-4"
        >
          Upcoming
        </Button>
        <Button
          variant={activeTab === 'past' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('past')}
                      className="px-4"
        >
          Past
        </Button>
                  </div>

        <Button
                    variant="outline"
          size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Branch Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch</label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Branches</option>
                        {Array.isArray(branches) && branches.map((branch: any) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Type</label>
                      <select
                        value={selectedServiceType}
                        onChange={(e) => setSelectedServiceType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Services</option>
                        {Array.isArray(serviceTypes) && serviceTypes.map((serviceType: any) => (
                          <option key={serviceType.id} value={serviceType.id}>
                            {serviceType.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All Statuses</option>
                        <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                        <option value={BookingStatus.COMPLETED}>Completed</option>
                        <option value={BookingStatus.CANCELLED}>Cancelled</option>
                        <option value={BookingStatus.NO_SHOW}>No Show</option>
                      </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        className="w-full"
                      >
                        Clear All
        </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

        {/* Ultra-Compact Booking Cards */}
        <div className="space-y-3">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-all duration-200">
                <CardContent className="px-6 py-6">
                  {/* Single Line Layout */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 flex-1 min-w-0">
                      {/* Date & Time */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {booking.slot?.startTime} - {booking.slot?.endTime}
                          </p>
                        </div>
                      </div>

                      {/* Student/Teacher */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{isTeacher ? 'Student' : 'Teacher'}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {isTeacher ? booking.student?.name : booking.slot?.teacher?.name}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center space-x-3 min-w-0">
                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {booking.slot?.branch?.name}
                          </p>
                        </div>
                      </div>

                      {/* Service Type & Room */}
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {booking.slot?.serviceType && (
                          <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                              {booking.slot.serviceType.name}
                            </span>
                        )}
                        {booking.slot?.room && (
                          <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                            R{booking.slot.room.roomNumber}
                            </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={getStatusColor(booking.status)} className="flex items-center space-x-1 text-xs px-2 py-1 ml-4 flex-shrink-0">
                      {getStatusIcon(booking.status)}
                      <span>{booking.status}</span>
                    </Badge>
                      </div>

                    {/* Cancellation Reason */}
                      {booking.cancellationReason && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400">
                            <strong>Cancellation reason:</strong> {booking.cancellationReason}
                          </p>
                        </div>
                      )}


                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {!isTeacher && booking.status === BookingStatus.CONFIRMED && booking.slot && new Date(booking.slot.date) > new Date() && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking)
                              setIsCancelDialogOpen(true)
                            }}
                            className="flex items-center space-x-1 text-xs"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </Button>
                          <Link to={`/schedule?reschedule=${booking.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center space-x-1 text-xs">
                              <RotateCcw className="w-3 h-3" />
                              <span>Reschedule</span>
                            </Button>
                          </Link>
                        </>
                      )}

                      {isTeacher && booking.status === BookingStatus.COMPLETED && (
                        <Link to={`/assessments?booking=${booking.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center space-x-1 text-xs">
                            <FileText className="w-3 h-3" />
                            <span>Assessment</span>
                          </Button>
                        </Link>
                      )}
                    </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="text-center">
              <CardContent className="py-20">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {activeTab === 'upcoming' ? 'No upcoming bookings' :
                    activeTab === 'past' ? 'No past bookings' : 'No bookings found'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {activeTab === 'upcoming' ? 'Book your first speaking test to get started with your IELTS preparation journey' :
                    'Your booking history will appear here once you have completed some sessions'}
                </p>
                {activeTab === 'upcoming' && !isTeacher && (
                  <Link to="/schedule">
                    <Button size="lg" className="flex items-center space-x-2 mx-auto">
                      <Plus className="w-5 h-5" />
                      <span>Book Your First Test</span>
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

          {/* Help & Support - Only show for students */}
          {!isTeacher && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
              <CardHeader>
                <CardTitle className="text-lg text-green-900 dark:text-green-100">Help & Support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="font-medium text-green-900 dark:text-green-100 mb-1">Need to reschedule?</p>
                    <p className="text-sm text-green-700 dark:text-green-300">You can reschedule up to 24 hours before your test.</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="font-medium text-green-900 dark:text-green-100 mb-1">Cancellation policy</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Free cancellation up to 2 hours before your test.</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20">
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
      </div>

      {/* Enhanced Cancel Booking Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                    {selectedBooking.slot?.date && format(new Date(selectedBooking.slot.date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedBooking.slot?.startTime} - {selectedBooking.slot?.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Teacher</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedBooking.slot?.teacher?.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  rows={3}
                  placeholder="Please let us know why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCancelDialogOpen(false)}
                >
                  Keep Booking
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancelBooking}
                  disabled={cancelBookingMutation.isPending}
                >
                  {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Bookings