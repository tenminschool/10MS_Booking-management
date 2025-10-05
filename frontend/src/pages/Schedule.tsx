import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slotsAPI, branchesAPI, bookingsAPI, dashboardAPI, serviceTypesAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import type { SlotFilters, Slot, ServiceType } from '@/types'
import { Link } from 'react-router-dom'
import { format, addDays, subDays } from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  MapPin, 
  User, 
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  BookOpen,
  GraduationCap,
  HelpCircle
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
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
  <h2 className="text-xl font-semibold">{children}</h2>
)
const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)

// SlotCard component definition
interface SlotCardProps {
  slot: Slot
  onBook: (slot: Slot) => void
  isAvailable: boolean
  compact?: boolean
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onBook, isAvailable, compact = false }) => {
  const { user } = useAuth()
  const isTeacher = user?.role === UserRole.TEACHER
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BRANCH_ADMIN
  const isStudent = user?.role === UserRole.STUDENT
  
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
            <div className="flex items-center space-x-2">
              <Badge variant={isAvailable ? 'default' : 'secondary'}>
                {slot.bookedCount}/{slot.capacity}
              </Badge>
              {isAdmin && (
                <Badge variant="outline" className="text-xs">
                  {slot.branch?.name}
                </Badge>
              )}
            </div>
          </div>
          
          {!compact && (
            <>
              {/* Show teacher info for students and admins */}
              {(isStudent || isAdmin) && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{slot.teacher?.name}</span>
                </div>
              )}
              
              {/* Show branch info for all roles */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{slot.branch?.name}</span>
              </div>

              {/* Show service type info */}
              {slot.serviceType && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {slot.serviceType.name}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {slot.serviceType.durationMinutes} min
                  </span>
                </div>
              )}

              {/* Show room info if assigned */}
              {slot.room && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="text-xs">Room: {slot.room.roomNumber} - {slot.room.roomName}</span>
                </div>
              )}
              
              {/* Show additional info for admins */}
              {isAdmin && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>ID: {slot.id}</span>
                </div>
              )}
            </>
          )}
          
          {/* Role-based action buttons */}
          {isTeacher ? (
            <div className="space-y-2">
              <Link to={`/bookings?slot=${slot.id}`}>
                <Button
                  size={compact ? 'sm' : 'default'}
                  className="w-full text-xs sm:text-sm"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View Students ({slot.bookedCount})</span>
                  <span className="sm:hidden">Students ({slot.bookedCount})</span>
                </Button>
              </Link>
              <Button
                size={compact ? 'sm' : 'default'}
                className="w-full text-xs sm:text-sm"
                variant="outline"
              >
                <GraduationCap className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Mark Attendance</span>
                <span className="sm:hidden">Attendance</span>
              </Button>
            </div>
          ) : isAdmin ? (
            <div className="space-y-2">
              <Button
                size={compact ? 'sm' : 'default'}
                className="w-full text-xs sm:text-sm"
                variant="outline"
              >
                <Users className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Manage Bookings</span>
                <span className="sm:hidden">Bookings</span>
              </Button>
              <Button
                size={compact ? 'sm' : 'default'}
                className="w-full text-xs sm:text-sm"
                variant="outline"
              >
                <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Edit Slot</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </div>
          ) : isStudent ? (
            <Button
              size={compact ? 'sm' : 'default'}
              className="w-full text-xs sm:text-sm"
              disabled={!isAvailable}
              onClick={() => onBook(slot)}
            >
              <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
              {isAvailable ? 'Book Slot' : 'Full'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

const Schedule: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [displayView, setDisplayView] = useState<'list' | 'calendar'>('calendar')
  const [filters, setFilters] = useState<SlotFilters>({
    view: 'monthly',
    date: format(new Date(), 'yyyy-MM-dd'),
    // For teachers, automatically filter to their slots
    ...(user?.role === UserRole.TEACHER && { teacherId: user.id })
  })
  const [selectedServiceType, setSelectedServiceType] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      return (response as any).data
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

  // Fetch available slots
  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', filters, selectedServiceType],
    queryFn: async () => {
      const response = await slotsAPI.getAvailable({
        ...filters,
        ...(selectedServiceType && { serviceTypeId: selectedServiceType })
      })
      return (response as any).data
    },
  })

  // Fetch dashboard data for next booking
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await dashboardAPI.getMetrics()
      return (response as any).data
    },
  })

  // Book slot mutation
  const bookSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const response = await bookingsAPI.create({ 
        slotId, 
        studentPhoneNumber: user?.phoneNumber || '',
        serviceTypeId: selectedSlot?.serviceTypeId || ''
      })
      return (response as any).data
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


  const handleBranchFilter = (branchId: string) => {
    setFilters(prev => ({
      ...prev,
      branchId: branchId === 'all' ? undefined : branchId
    }))
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' ? addDays(selectedDate, 30) : subDays(selectedDate, 30)
    handleDateChange(newDate)
  }

  const getDateRange = () => {
    return format(selectedDate, 'MMMM yyyy')
  }


  const handleBookSlot = (slot: Slot) => {
    setSelectedSlot(slot)
    setIsBookingDialogOpen(true)
  }

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return
    
    setIsConfirming(true)
    try {
      await bookSlotMutation.mutateAsync(selectedSlot.id)
      addToast({
        type: 'success',
        title: 'Booking Confirmed!',
        message: `Successfully booked slot for ${format(new Date(selectedSlot.date), 'MMM dd, yyyy')} at ${selectedSlot.startTime}`
      })
    } catch (error) {
      console.error('Booking failed:', error)
      addToast({
        type: 'error',
        title: 'Booking Failed',
        message: 'Unable to book this slot. Please try again or contact support.'
      })
    } finally {
      setIsConfirming(false)
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
    <div className="space-y-6 bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {user?.role === UserRole.SUPER_ADMIN && 'System Schedule Management'}
              {user?.role === UserRole.BRANCH_ADMIN && 'Branch Schedule Management'}
              {user?.role === UserRole.TEACHER && 'My Teaching Schedule'}
              {user?.role === UserRole.STUDENT && 'Available Speaking Test Slots'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {user?.role === UserRole.SUPER_ADMIN && 'Manage all speaking test slots across all branches and monitor system-wide scheduling'}
              {user?.role === UserRole.BRANCH_ADMIN && 'Manage speaking test slots for your branch and monitor teacher schedules'}
              {user?.role === UserRole.TEACHER && 'View your assigned speaking test slots, manage sessions, and track student attendance'}
              {user?.role === UserRole.STUDENT && 'Browse and book speaking test slots across all branches'}
            </p>
          </div>
        
        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Display View Toggle */}
          <div className="flex items-center space-x-2 border rounded-lg p-1 w-fit">
            <Tooltip content="View slots in a detailed list format">
              <Button
                variant={displayView === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayView('list')}
                className="flex items-center space-x-1"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </Tooltip>
            <Tooltip content="View slots in a monthly calendar format">
              <Button
                variant={displayView === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayView('calendar')}
                className="flex items-center space-x-1"
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
            </Tooltip>
          </div>
          
          {/* Role-based Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === UserRole.SUPER_ADMIN && (
              <>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Manage Teachers</span>
                  <span className="sm:hidden">Teachers</span>
                </Button>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Manage Branches</span>
                  <span className="sm:hidden">Branches</span>
                </Button>
                <Button variant="default" size="sm" className="text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Create Slot</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </>
            )}
            {user?.role === UserRole.BRANCH_ADMIN && (
              <>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Manage Teachers</span>
                  <span className="sm:hidden">Teachers</span>
                </Button>
                <Button variant="default" size="sm" className="text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Create Slot</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </>
            )}
            {user?.role === UserRole.TEACHER && (
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <GraduationCap className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">View Assessments</span>
                <span className="sm:hidden">Assessments</span>
              </Button>
            )}
            {user?.role === UserRole.STUDENT && (
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <BookOpen className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">My Bookings</span>
                <span className="sm:hidden">Bookings</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Two-Column Layout: 3/4 Primary + 1/4 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* PRIMARY CONTENT - 3/4 width */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6">
          {/* Date Navigation */}
          <div className="flex items-center justify-between space-x-2">
            <Button variant="outline" onClick={() => navigateDate('prev')} size="sm" className="text-xs sm:text-sm">
              <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            
            <div className="text-center flex-1 px-2">
              <h2 className="text-sm sm:text-lg font-semibold truncate">{getDateRange()}</h2>
            </div>
            
            <Button variant="outline" onClick={() => navigateDate('next')} size="sm" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          </div>

          {/* Calendar/Schedule View */}
          {displayView === 'calendar' ? (
            <CalendarComponent
              selectedDate={selectedDate}
              onDateSelect={handleDateChange}
              onSlotClick={handleBookSlot}
              slots={slots || []}
              className="w-full"
            />
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {format(selectedDate, 'MMMM yyyy')} - Available Slots
              </h3>
              <div className="grid gap-4">
                {slots?.map((slot: any) => (
                  <SlotCard 
                    key={slot.id} 
                    slot={slot} 
                    onBook={handleBookSlot}
                    isAvailable={isSlotAvailable(slot)}
                  />
                ))}
                {(!slots || slots.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No slots available for this month
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECONDARY CONTENT - 1/4 width */}
        <div className="space-y-4">
          {/* Filters & Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <Tooltip content="Filter slots by branch to see only relevant time slots">
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Branch Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Branch</label>
                  <div className="space-y-1">
                    <Button
                      variant={!filters.branchId ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={() => handleBranchFilter('all')}
                    >
                      All Branches
                    </Button>
                    {Array.isArray(branches) && branches.map((branch: any) => (
                      <Button
                        key={branch.id}
                        variant={filters.branchId === branch.id ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start text-xs h-8"
                        onClick={() => handleBranchFilter(branch.id)}
                      >
                        {branch.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Service Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Service Type</label>
                  <div className="space-y-1">
                    <Button
                      variant={!selectedServiceType ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={() => setSelectedServiceType('')}
                    >
                      All Services
                    </Button>
                    {Array.isArray(serviceTypes) && serviceTypes.map((serviceType: ServiceType) => (
                      <Button
                        key={serviceType.id}
                        variant={selectedServiceType === serviceType.id ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start text-xs h-8"
                        onClick={() => setSelectedServiceType(serviceType.id)}
                      >
                        {serviceType.name} ({serviceType.durationMinutes}min)
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
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
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
                {selectedSlot.serviceType && (
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {selectedSlot.serviceType.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {selectedSlot.serviceType.durationMinutes} minutes
                    </span>
                  </div>
                )}
                {selectedSlot.room && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      Room: {selectedSlot.room.roomNumber} - {selectedSlot.room.roomName}
                    </span>
                  </div>
                )}
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
                  onClick={handleConfirmBooking}
                  disabled={isConfirming || bookSlotMutation.isPending}
                >
                  {isConfirming || bookSlotMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Schedule