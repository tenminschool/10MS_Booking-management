import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { bookingsAPI, usersAPI, branchesAPI, slotsAPI } from '@/lib/api'
import { UserRole, type User, type Booking, type Branch, type Slot } from '@/types'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Helper function to safely format dates
const safeFormatDate = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid Date'
  try {
    return format(date, formatString)
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  CheckSquare,
  CalendarDays,
  Building,
  GraduationCap,
  Phone
} from 'lucide-react'

// Mock UI components - replace with actual shadcn/ui components when available
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

const AdminBookings: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'confirmed' | 'cancelled' | 'completed' | ''>('')
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [page, setPage] = useState(1)
  const limit = 20


  // Only super admins and branch admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN && user?.role !== UserRole.BRANCH_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Only Super Admins and Branch Admins can manage bookings.</p>
        </div>
      </div>
    )
  }

  // Fetch bookings based on filters
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-bookings', {
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : (branchFilter || undefined),
      date: dateFilter || undefined,
      page,
      limit
    }],
        queryFn: async () => {
          const response = await bookingsAPI.getAll({
            search: searchTerm || undefined,
            status: statusFilter || undefined,
            branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : (branchFilter || undefined),
            date: dateFilter || undefined,
            page,
            limit
          })
          return (response as any).data
        },
  })

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
        queryFn: async () => {
          const response = await branchesAPI.getAll()
          return (response as any).data
        },
  })

  // Fetch students for booking creation
  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await usersAPI.getAll({ role: UserRole.STUDENT })
      return (response as any).data
    },
  })

  // Fetch available slots
  const { data: slotsData } = useQuery({
    queryKey: ['available-slots'],
    queryFn: async () => {
      const response = await slotsAPI.getAvailable()
      return (response as any).data
    },
  })

  const bookings = bookingsData?.bookings || []
  const pagination = bookingsData?.pagination
  const branches = branchesData?.branches || []
  const students = studentsData?.users || []
  const slots = slotsData || []

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await bookingsAPI.create(data)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      setShowCreateForm(false)
      successToast('Booking created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create booking')
    }
  })

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await bookingsAPI.update(id, data)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      setEditingBooking(null)
      successToast('Booking updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update booking')
    }
  })

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await bookingsAPI.cancel(id)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] })
      successToast('Booking cancelled successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to cancel booking')
    }
  })

  const handleCreateBooking = (bookingData: any) => {
    createBookingMutation.mutate(bookingData)
  }

  const handleUpdateBooking = (bookingData: any) => {
    if (editingBooking) {
      updateBookingMutation.mutate({
        id: editingBooking.id,
        data: bookingData
      })
    }
  }

  const handleCancelBooking = (bookingId: string) => {
    if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      cancelBookingMutation.mutate(bookingId)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'completed':
        return <CheckSquare className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'completed':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getBookingStats = () => {
    const total = bookings.length
    const confirmed = bookings.filter((b: any) => b.status === 'confirmed').length
    const cancelled = bookings.filter((b: any) => b.status === 'cancelled').length
    const completed = bookings.filter((b: any) => b.status === 'completed').length
    const today = bookings.filter((b: any) => {
      if (!b.slot?.startTime) return false
      const bookingDate = new Date(b.slot.startTime)
      if (isNaN(bookingDate.getTime())) return false
      const today = new Date()
      return bookingDate.toDateString() === today.toDateString()
    }).length

    return { total, confirmed, cancelled, completed, today }
  }

  const stats = getBookingStats()

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'Booking Management', current: true }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all bookings across all branches with complete control and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            size="sm"
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Booking
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckSquare className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Grid/Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking: any) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {booking.student?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <CardTitle className="text-base">{booking.student?.name || 'Unknown Student'}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(booking.status)}
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingBooking(booking)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{safeFormatDate(booking.slot?.startTime, 'MMM dd, yyyy')}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{safeFormatDate(booking.slot?.startTime, 'h:mm a')} - {safeFormatDate(booking.slot?.endTime, 'h:mm a')}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                    <span>{booking.slot?.teacher?.name || 'No Teacher'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building className="w-4 h-4" />
                    <span>{booking.slot?.branch?.name || 'No Branch'}</span>
                  </div>

                  {booking.student?.phoneNumber && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{booking.student.phoneNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {booking.id.slice(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {safeFormatDate(booking.createdAt, 'MMM dd')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {bookings.length === 0 && (
            <div className="col-span-full">
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No bookings found</p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Create First Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Bookings Table</span>
            </CardTitle>
            <CardDescription>
              Detailed view of all bookings with their information and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date & Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Teacher</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Branch</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking: any) => (
                    <tr key={booking.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {booking.student?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{booking.student?.name || 'Unknown Student'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {booking.student?.phoneNumber || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {safeFormatDate(booking.slot?.startTime, 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {safeFormatDate(booking.slot?.startTime, 'h:mm a')} - {safeFormatDate(booking.slot?.endTime, 'h:mm a')}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {booking.slot?.teacher?.name || 'No Teacher'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {booking.slot?.branch?.name || 'No Branch'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(booking.status)}
                          <Badge variant={getStatusBadgeVariant(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {safeFormatDate(booking.createdAt, 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingBooking(booking)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} bookings
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Booking Modal */}
      {(showCreateForm || editingBooking) && (
        <BookingFormModal
          booking={editingBooking}
          students={students}
          slots={slots}
          branches={branches}
          onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking}
          onClose={() => {
            setShowCreateForm(false)
            setEditingBooking(null)
          }}
          isLoading={createBookingMutation.isPending || updateBookingMutation.isPending}
        />
      )}
    </div>
  )
}

// Booking Form Modal Component
interface BookingFormModalProps {
  booking?: Booking | null
  students: User[]
  slots: Slot[]
  branches: Branch[]
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const BookingFormModal: React.FC<BookingFormModalProps> = ({
  booking,
  students,
  slots,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    studentId: booking?.studentId || '',
    slotId: booking?.slotId || '',
    status: booking?.status || 'confirmed',
    notes: booking?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const selectedSlot = slots.find(slot => slot.id === formData.slotId)
  const availableSlots = slots.filter(slot => {
    if (!slot.startTime) return false
    const slotDate = new Date(slot.startTime)
    if (isNaN(slotDate.getTime())) return false
    return !slot.isBooked && slotDate > new Date()
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {booking ? 'Edit Booking' : 'Create New Booking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student *
            </label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.phoneNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Available Slot *
            </label>
            <select
              value={formData.slotId}
              onChange={(e) => setFormData({ ...formData, slotId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select Slot</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {safeFormatDate(slot.startTime, 'MMM dd, yyyy h:mm a')} - {slot.teacher?.name} ({slot.branch?.name})
                </option>
              ))}
            </select>
          </div>

          {selectedSlot && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Selected Slot Details:</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>Date: {safeFormatDate(selectedSlot.startTime, 'MMM dd, yyyy')}</div>
                <div>Time: {safeFormatDate(selectedSlot.startTime, 'h:mm a')} - {safeFormatDate(selectedSlot.endTime, 'h:mm a')}</div>
                <div>Teacher: {selectedSlot.teacher?.name}</div>
                <div>Branch: {selectedSlot.branch?.name}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status *
            </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Additional notes for this booking..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? 'Saving...' : (booking ? 'Update Booking' : 'Create Booking')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminBookings
