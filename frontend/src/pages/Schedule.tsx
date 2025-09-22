import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slotsAPI, branchesAPI, bookingsAPI, dashboardAPI } from '@/lib/api'
// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' :
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
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
    variant === 'destructive' ? 'bg-red-100 text-red-800' :
    'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)
const Calendar = ({ className }: any) => (
  <div className={`p-4 border rounded-lg ${className || ''}`}>
    <div className="text-center text-gray-500">Calendar Component (Mock)</div>
  </div>
)
const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
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
  <h2 className="text-xl font-semibold">{children}</h2>
)
const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)

import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap
} from 'lucide-react'
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import type { SlotFilters, Slot, UserRole } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'

const Schedule: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [filters, setFilters] = useState<SlotFilters>({
    view: 'weekly',
    date: format(new Date(), 'yyyy-MM-dd'),
    // For teachers, automatically filter to their slots
    ...(user?.role === UserRole.TEACHER && { teacherId: user.id })
  })
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      return response.data
    },
  })

  // Fetch available slots
  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', filters],
    queryFn: async () => {
      const response = await slotsAPI.getAvailable(filters)
      return response.data
    },
  })

  // Fetch dashboard data for next booking
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await dashboardAPI.getMetrics()
      return response.data
    },
  })

  // Book slot mutation
  const bookSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const response = await bookingsAPI.create({ 
        slotId, 
        studentPhoneNumber: user?.phoneNumber || '' 
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      setIsBookingDialogOpen(false)
      setSelectedSlot(null)
    },
  })

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFilters(prev => ({
        ...prev,
        date: format(date, 'yyyy-MM-dd')
      }))
    }
  }

  const handleViewChange = (newView: 'daily' | 'weekly' | 'monthly') => {
    setView(newView)
    setFilters(prev => ({
      ...prev,
      view: newView
    }))
  }

  const handleBranchFilter = (branchId: string) => {
    setFilters(prev => ({
      ...prev,
      branchId: branchId === 'all' ? undefined : branchId
    }))
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date
    if (view === 'daily') {
      newDate = direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1)
    } else if (view === 'weekly') {
      newDate = direction === 'next' ? addDays(selectedDate, 7) : subDays(selectedDate, 7)
    } else {
      newDate = direction === 'next' ? addDays(selectedDate, 30) : subDays(selectedDate, 30)
    }
    handleDateChange(newDate)
  }

  const getDateRange = () => {
    if (view === 'daily') {
      return format(selectedDate, 'EEEE, MMMM dd, yyyy')
    } else if (view === 'weekly') {
      const start = startOfWeek(selectedDate)
      const end = endOfWeek(selectedDate)
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
    } else {
      return format(selectedDate, 'MMMM yyyy')
    }
  }

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate)
    const end = endOfWeek(selectedDate)
    return eachDayOfInterval({ start, end })
  }

  const getSlotsByDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return slots?.filter((slot: any) => slot.date === dateStr) || []
  }

  const handleBookSlot = (slot: Slot) => {
    setSelectedSlot(slot)
    setIsBookingDialogOpen(true)
  }

  const confirmBooking = () => {
    if (selectedSlot) {
      bookSlotMutation.mutate(selectedSlot.id)
    }
  }

  const isSlotAvailable = (slot: Slot) => {
    return slot.bookedCount < slot.capacity
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === UserRole.TEACHER ? 'My Schedule' : 'Available Slots'}
          </h1>
          <p className="text-gray-600">
            {user?.role === UserRole.TEACHER 
              ? 'View your assigned speaking test slots and sessions'
              : 'Browse and book speaking test slots across all branches'}
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('daily')}
          >
            Daily
          </Button>
          <Button
            variant={view === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('weekly')}
          >
            Weekly
          </Button>
          <Button
            variant={view === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-center">
              <h2 className="text-lg font-semibold">{getDateRange()}</h2>
            </div>
            
            <Button variant="outline" onClick={() => navigateDate('next')}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Calendar/Schedule View */}
          {view === 'monthly' ? (
            <Card>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {view === 'daily' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                  </h3>
                  <div className="grid gap-4">
                    {getSlotsByDate(selectedDate).map((slot) => (
                      <SlotCard 
                        key={slot.id} 
                        slot={slot} 
                        onBook={handleBookSlot}
                        isAvailable={isSlotAvailable(slot)}
                      />
                    ))}
                    {getSlotsByDate(selectedDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No slots available for this date
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {getWeekDays().map((day) => (
                    <div key={day.toISOString()} className="space-y-2">
                      <h3 className="font-medium text-center p-2 bg-gray-50 rounded">
                        {format(day, 'EEE dd')}
                      </h3>
                      <div className="space-y-2">
                        {getSlotsByDate(day).map((slot) => (
                          <SlotCard 
                            key={slot.id} 
                            slot={slot} 
                            onBook={handleBookSlot}
                            isAvailable={isSlotAvailable(slot)}
                            compact
                          />
                        ))}
                        {getSlotsByDate(day).length === 0 && (
                          <div className="text-xs text-gray-400 text-center py-4">
                            No slots
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECONDARY CONTENT - 1/3 width */}
        <div className="space-y-6">
          {/* Filters & Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Branch Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  <div className="space-y-2">
                    <Button
                      variant={!filters.branchId ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleBranchFilter('all')}
                    >
                      All Branches
                    </Button>
                    {branches?.map((branch: any) => (
                      <Button
                        key={branch.id}
                        variant={filters.branchId === branch.id ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleBranchFilter(branch.id)}
                      >
                        {branch.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          {selectedSlot && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Selected Slot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {format(new Date(selectedSlot.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{selectedSlot.teacher?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{selectedSlot.branch?.name}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => handleBookSlot(selectedSlot)}
                    disabled={!isSlotAvailable(selectedSlot)}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {isSlotAvailable(selectedSlot) ? 'Book This Slot' : 'Slot Full'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Next Booking */}
          {dashboardData?.upcomingBookings?.[0] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">My Next Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div className="font-medium">
                        {dashboardData.upcomingBookings[0].slot?.date && 
                          format(new Date(dashboardData.upcomingBookings[0].slot.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-gray-600">
                        {dashboardData.upcomingBookings[0].slot?.startTime} - {dashboardData.upcomingBookings[0].slot?.endTime}
                      </div>
                      <div className="text-gray-600">
                        {dashboardData.upcomingBookings[0].slot?.teacher?.name}
                      </div>
                    </div>
                  </div>
                  <Link to="/bookings">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => handleDateChange(new Date())}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Today's Slots
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              Please confirm your speaking test booking details
            </DialogDescription>
          </DialogHeader>
          
          {selectedSlot && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {format(new Date(selectedSlot.date), 'EEEE, MMMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{selectedSlot.teacher?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{selectedSlot.branch?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{selectedSlot.bookedCount + 1} / {selectedSlot.capacity} students</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsBookingDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  onClick={confirmBooking}
                  disabled={bookSlotMutation.isPending}
                >
                  {bookSlotMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SlotCardProps {
  slot: Slot
  onBook: (slot: Slot) => void
  isAvailable: boolean
  compact?: boolean
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onBook, isAvailable, compact = false }) => {
  const { user } = useAuth()
  const isTeacher = user?.role === UserRole.TEACHER
  
  return (
    <Card className={`${compact ? 'p-2' : 'p-4'} ${!isAvailable ? 'opacity-60' : ''}`}>
      <CardContent className={compact ? 'p-2' : 'p-4'}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className={`font-medium ${compact ? 'text-sm' : ''}`}>
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
            <Badge variant={isAvailable ? 'default' : 'secondary'}>
              {slot.bookedCount}/{slot.capacity}
            </Badge>
          </div>
          
          {!compact && (
            <>
              {!isTeacher && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{slot.teacher?.name}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{slot.branch?.name}</span>
              </div>
            </>
          )}
          
          {isTeacher ? (
            <Link to={`/bookings?slot=${slot.id}`}>
              <Button
                size={compact ? 'sm' : 'default'}
                className="w-full"
                variant="outline"
              >
                <Users className="w-4 h-4 mr-2" />
                View Students ({slot.bookedCount})
              </Button>
            </Link>
          ) : (
            <Button
              size={compact ? 'sm' : 'default'}
              className="w-full"
              disabled={!isAvailable}
              onClick={() => onBook(slot)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {isAvailable ? 'Book Slot' : 'Full'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default Schedule