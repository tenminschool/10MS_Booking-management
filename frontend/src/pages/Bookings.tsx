import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookingsAPI, dashboardAPI } from '@/lib/api'
import { Breadcrumb } from '@/components/ui/breadcrumb'
// Mock UI components - replace with actual shadcn/ui components when available
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
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
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
    className={`px-4 py-2 rounded-md font-medium transition-colors ${variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
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
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
      'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
    } ${className}`}>
    {children}
  </span>
)
const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => onOpenChange(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
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
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const Bookings: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  // Removed unused attendanceUpdates state

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ id, attended }: { id: string; attended: boolean }) => {
      const response = await bookingsAPI.markAttendance(id, attended)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    },
  })

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await bookingsAPI.getMyBookings()
      return (response as any).data
    },
  })

  // Fetch dashboard data for stats
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await dashboardAPI.getMetrics()
      return (response as any).data
    },
  })

  const isTeacher = user?.role === UserRole.TEACHER

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

  const filterBookings = (bookings: any) => {
    // Ensure bookings is an array
    const bookingsArray = Array.isArray(bookings) ? bookings : []
    const now = new Date()
    switch (activeTab as 'all' | 'upcoming' | 'past') {
      case 'upcoming':
        return bookingsArray.filter(booking =>
          booking.status === BookingStatus.CONFIRMED &&
          booking.slot && new Date(booking.slot.date) >= now
        )
      case 'past':
        return bookingsArray.filter(booking =>
          booking.slot && new Date(booking.slot.date) < now
        )
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const allBookings = Array.isArray(bookings) ? bookings : []
  const filteredBookings = filterBookings(allBookings)
  const upcomingBookings = (dashboardData as any)?.upcomingBookings || []

  const breadcrumbItems = [
    { label: 'Bookings', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isTeacher ? 'My Sessions' : 'My Bookings'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isTeacher
              ? 'Manage your teaching sessions and mark attendance'
              : 'Manage your speaking test bookings'}
          </p>
        </div>

        {!isTeacher && (
          <Link to="/schedule">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Book New Test
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={activeTab === 'past' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('past')}
        >
          Past
        </Button>
        <Button
          variant={activeTab === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('all')}
        >
          All
        </Button>
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {booking.slot?.date && format(new Date(booking.slot.date), 'EEEE, MMMM dd, yyyy')}
                          </span>
                        </div>
                        <Badge variant={getStatusColor(booking.status)} className="flex items-center space-x-1">
                          {getStatusIcon(booking.status)}
                          <span>{booking.status}</span>
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{booking.slot?.startTime} - {booking.slot?.endTime}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {isTeacher ? (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{booking.student?.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{booking.slot?.teacher?.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.slot?.branch?.name}</span>
                        </div>
                      </div>

                      {/* Service Type and Room Information */}
                      <div className="flex items-center space-x-4 text-sm">
                        {booking.slot?.serviceType && (
                          <div className="flex items-center space-x-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {booking.slot.serviceType.name}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {booking.slot.serviceType.durationMinutes} min
                            </span>
                          </div>
                        )}
                        {booking.slot?.room && (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-600 text-xs">
                              Room: {booking.slot.room.roomNumber} - {booking.slot.room.roomName}
                            </span>
                          </div>
                        )}
                      </div>

                      {booking.cancellationReason && (
                        <div className="p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>Cancellation reason:</strong> {booking.cancellationReason}
                          </p>
                        </div>
                      )}

                      {/* Teacher-specific attendance section */}
                      {isTeacher && booking.status === BookingStatus.CONFIRMED && booking.slot && new Date(booking.slot.date) <= new Date() && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Mark Attendance:</span>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant={booking.attended === true ? "default" : "outline"}
                                disabled={markAttendanceMutation.isPending}
                                onClick={() => {
                                  markAttendanceMutation.mutate({
                                    id: booking.id,
                                    attended: true
                                  })
                                }}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={booking.attended === false ? "destructive" : "outline"}
                                disabled={markAttendanceMutation.isPending}
                                onClick={() => {
                                  markAttendanceMutation.mutate({
                                    id: booking.id,
                                    attended: false
                                  })
                                }}
                              >
                                Absent
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {!isTeacher && booking.status === BookingStatus.CONFIRMED && booking.slot && new Date(booking.slot.date) > new Date() && (
                    <div className="flex space-x-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking)
                          setIsCancelDialogOpen(true)
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Link to={`/schedule?reschedule=${booking.id}`}>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reschedule
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Teacher action buttons */}
                  {isTeacher && booking.status === BookingStatus.COMPLETED && (
                    <div className="flex space-x-2 mt-4 pt-4 border-t">
                      <Link to={`/assessments?booking=${booking.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Record Assessment
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {activeTab === 'upcoming' ? 'No upcoming bookings' :
                    activeTab === 'past' ? 'No past bookings' : 'No bookings found'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'upcoming' ? 'Book your first speaking test to get started' :
                    'Your booking history will appear here'}
                </p>
                {activeTab === 'upcoming' && (
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
          {/* Booking Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Booking Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Bookings</span>
                  <span className="font-medium">{allBookings.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium">
                    {allBookings.filter((b: Booking) => b.status === BookingStatus.COMPLETED).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Upcoming</span>
                  <span className="font-medium">
                    {allBookings.filter((b: Booking) => b.status === BookingStatus.CONFIRMED).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                  <span className="font-medium">
                    {(dashboardData as any)?.attendanceRate ?
                      `${Math.round((dashboardData as any).attendanceRate)}%` : '0%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          {upcomingBookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">
                          {booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd')}
                        </div>
                        <div className="text-gray-600">
                          {booking.slot?.startTime} - {booking.slot?.teacher?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {/* Help & Support */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Help & Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Need to reschedule?</p>
                  <p className="text-gray-600">You can reschedule up to 24 hours before your test.</p>
                </div>
                <div>
                  <p className="font-medium">Cancellation policy</p>
                  <p className="text-gray-600">Free cancellation up to 2 hours before your test.</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Booking Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {selectedBooking.slot?.date && format(new Date(selectedBooking.slot.date), 'EEEE, MMMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{selectedBooking.slot?.startTime} - {selectedBooking.slot?.endTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{selectedBooking.slot?.teacher?.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                <textarea
                  className="w-full p-2 border rounded-md text-sm"
                  rows={3}
                  placeholder="Please let us know why you're cancelling..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex space-x-2">
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