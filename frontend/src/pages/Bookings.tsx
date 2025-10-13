import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookingsAPI, branchesAPI, serviceTypesAPI } from '@/lib/api'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import BookingCard from '@/components/BookingCard'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import {
  Clock,
  BookOpen,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  GraduationCap,
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


const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>{children}</div>
)


const CardContent: React.FC<CardContentProps> = ({ children, className = '' }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
        'bg-blue-600 text-white hover:bg-blue-700'
      } ${size === 'sm' ? 'px-3 py-1 text-sm' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
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

const Bookings: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State management
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedServiceType, setSelectedServiceType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // API queries
  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsAPI.getMyBookings(),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesAPI.getAll(),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => serviceTypesAPI.getAll(),
    retry: false,
    refetchOnWindowFocus: false,
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

  // Helper functions
  const isTeacher = user?.role === UserRole.TEACHER

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

  // Filter bookings
  const filteredBookings = useMemo(() => {
    if (!(bookings as any)?.data) return []
    
    const bookingsArray = Array.isArray((bookings as any).data) ? (bookings as any).data : []
    const now = new Date()
    
    let filtered = bookingsArray

    // Filter by tab
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter((booking: any) => 
          booking.slot && new Date(booking.slot.date) >= now
        )
        break
      case 'past':
        filtered = filtered.filter((booking: any) => 
          booking.slot && new Date(booking.slot.date) < now
        )
        break
      default:
        // 'all' - no additional filtering
        break
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((booking: any) => 
        (isTeacher ? booking.student?.name : booking.slot?.teacher?.name)?.toLowerCase().includes(query) ||
        booking.slot?.branch?.name?.toLowerCase().includes(query) ||
        booking.slot?.serviceType?.name?.toLowerCase().includes(query) ||
        booking.slot?.startTime?.toLowerCase().includes(query) ||
        booking.slot?.endTime?.toLowerCase().includes(query) ||
        (booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd, yyyy').toLowerCase().includes(query))
      )
    }

    // Filter by branch
    if (selectedBranch) {
      filtered = filtered.filter((booking: any) => booking.slot?.branch?.id === selectedBranch)
    }

    // Filter by service type
    if (selectedServiceType) {
      filtered = filtered.filter((booking: any) => booking.slot?.serviceType?.id === selectedServiceType)
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter((booking: any) => booking.status === selectedStatus)
    }

    return filtered
  }, [(bookings as any)?.data, activeTab, searchQuery, selectedBranch, selectedServiceType, selectedStatus, isTeacher])

  const handleCancelBooking = () => {
    if (selectedBooking) {
      cancelBookingMutation.mutate({
        id: selectedBooking.id,
        reason: cancelReason || undefined
      })
    }
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedBranch('')
    setSelectedServiceType('')
    setSelectedStatus('')
  }

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600 dark:text-gray-400">Loading bookings...</p>
      </div>
    )
  }

  const allBookings = (bookings as any)?.data || []
  const upcomingBookings = allBookings.filter((booking: any) => 
    booking.slot && new Date(booking.slot.date) >= new Date()
  )
  const pastBookings = allBookings.filter((booking: any) => 
    booking.slot && new Date(booking.slot.date) < new Date()
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Bookings', href: '/bookings' }
        ]}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isTeacher ? 'My Teaching Sessions' : 'My Bookings'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isTeacher ? 'Manage your teaching sessions and mark student attendance' : 'View and manage your speaking test bookings'}
          </p>
        </div>
        <Button
          onClick={() => refetchBookings()}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
            </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">Total Sessions</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{allBookings.length}</p>
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
                  {allBookings.filter((booking: any) => booking.status === BookingStatus.COMPLETED).length}
                </p>
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
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{upcomingBookings.length}</p>
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
                    const completedBookings = allBookings.filter((booking: any) => booking.status === BookingStatus.COMPLETED)
                    const attendedBookings = completedBookings.filter((booking: any) => booking.attended === true)
                    return completedBookings.length > 0 ? `${Math.round((attendedBookings.length / completedBookings.length) * 100)}%` : '0%'
                  })()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, date, time, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex gap-2">
        <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
          size="sm"
                onClick={() => setActiveTab('all')}
                className="flex items-center space-x-1"
        >
                <span>All</span>
                <Badge variant="secondary" className="ml-1">{allBookings.length}</Badge>
        </Button>
        <Button
                variant={activeTab === 'upcoming' ? 'default' : 'outline'}
          size="sm"
                onClick={() => setActiveTab('upcoming')}
                className="flex items-center space-x-1"
        >
                <span>Upcoming</span>
                <Badge variant="secondary" className="ml-1">{upcomingBookings.length}</Badge>
        </Button>
        <Button
                variant={activeTab === 'past' ? 'default' : 'outline'}
          size="sm"
                onClick={() => setActiveTab('past')}
                className="flex items-center space-x-1"
        >
                <span>Past</span>
                <Badge variant="secondary" className="ml-1">{pastBookings.length}</Badge>
        </Button>
      </div>

            {/* Advanced Filters */}
            <div className="flex gap-2 items-center">
                              <Button
                variant="outline"
                                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-1"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                              </Button>

              {(selectedBranch || selectedServiceType || selectedStatus) && (
                              <Button
                  variant="outline"
                                size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                              </Button>
                      )}
                    </div>
                  </div>

          {/* Advanced Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Branches</option>
                  {Array.isArray((branches as any)?.data) && (branches as any).data.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Type</label>
                <select
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Services</option>
                  {Array.isArray((serviceTypes as any)?.data) && (serviceTypes as any).data.map((service: any) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                  <option value={BookingStatus.COMPLETED}>Completed</option>
                  <option value={BookingStatus.CANCELLED}>Cancelled</option>
                  <option value={BookingStatus.NO_SHOW}>No Show</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Booking Cards */}
      <div className="space-y-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking: any) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isTeacher={isTeacher}
              onCancel={(booking) => {
                          setSelectedBooking(booking)
                          setIsCancelDialogOpen(true)
                        }}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
            />
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

export default Bookings
