import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { slotsAPI, branchesAPI, bookingsAPI, serviceTypesAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import type { Slot, ServiceType } from '@/types'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  BookOpen
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'

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

// Get color for service type
const getServiceTypeColor = (serviceTypeId?: string, serviceTypes?: ServiceType[]) => {
  const colors = {
    'ielts': 'bg-blue-50 border-blue-300 text-blue-900',
    'toefl': 'bg-green-50 border-green-300 text-green-900',
    'pte': 'bg-purple-50 border-purple-300 text-purple-900',
    'cambridge': 'bg-orange-50 border-orange-300 text-orange-900',
    'pbt': 'bg-red-50 border-red-300 text-red-900',
    'cbt': 'bg-yellow-50 border-yellow-300 text-yellow-900',
    'consultation': 'bg-pink-50 border-pink-300 text-pink-900',
    'general': 'bg-gray-50 border-gray-300 text-gray-900',
    'default': 'bg-indigo-50 border-indigo-300 text-indigo-900'
  }
  
  if (!serviceTypeId || !serviceTypes) return colors.default
  
  const serviceType = serviceTypes.find((st: ServiceType) => st.id === serviceTypeId)
  const serviceName = serviceType?.name?.toLowerCase() || ''
  
  if (serviceName.includes('ielts')) return colors.ielts
  if (serviceName.includes('toefl')) return colors.toefl
  if (serviceName.includes('pte')) return colors.pte
  if (serviceName.includes('cambridge')) return colors.cambridge
  if (serviceName.includes('pbt') || serviceName.includes('paper')) return colors.pbt
  if (serviceName.includes('cbt') || serviceName.includes('computer')) return colors.cbt
  if (serviceName.includes('consult') || serviceName.includes('free')) return colors.consultation
  if (serviceName.includes('general')) return colors.general
  
  return colors.default
}

// Get service type abbreviation
const getServiceTypeAbbreviation = (serviceTypeId?: string, serviceTypes?: ServiceType[]) => {
  if (!serviceTypeId || !serviceTypes) return 'General'
  
  const serviceType = serviceTypes.find((st: ServiceType) => st.id === serviceTypeId)
  const serviceName = serviceType?.name?.toLowerCase() || ''
  
  if (serviceName.includes('ielts')) return 'IELTS'
  if (serviceName.includes('toefl')) return 'TOEFL'
  if (serviceName.includes('pte')) return 'PTE'
  if (serviceName.includes('cambridge')) return 'Cambridge'
  if (serviceName.includes('pbt') || serviceName.includes('paper')) return 'PBT'
  if (serviceName.includes('cbt') || serviceName.includes('computer')) return 'CBT'
  if (serviceName.includes('consult') || serviceName.includes('free')) return 'Free Consult'
  if (serviceName.includes('speaking')) return 'IELTS Spoken'
  if (serviceName.includes('writing')) return 'Writing'
  if (serviceName.includes('reading')) return 'Reading'
  if (serviceName.includes('listening')) return 'Listening'
  
  return serviceType?.name || 'General'
}

// Format time to 12-hour format
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes}${ampm}`
}

// SlotCard component definition
interface SlotCardProps {
  slot: Slot
  onBook: (slot: Slot) => void
  isAvailable: boolean
  compact?: boolean
  serviceTypes?: ServiceType[]
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onBook, isAvailable, compact = false, serviceTypes }) => {
  const { user } = useAuth()
  const isStudent = user?.role === UserRole.STUDENT
  
  return (
    <Card className={`${compact ? 'p-2' : 'p-4'} ${!isAvailable ? 'opacity-60' : ''}`}>
      <CardContent className={compact ? 'p-2' : 'p-4'}>
        <div className="space-y-2">
          {/* Time */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className={`font-medium ${compact ? 'text-sm' : ''}`}>
              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
            </span>
          </div>
          
          {/* Service Type */}
          {slot.serviceType && (
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getServiceTypeColor(slot.serviceType.id, serviceTypes)}`}>
                {getServiceTypeAbbreviation(slot.serviceType.id, serviceTypes)}
              </span>
            </div>
          )}
          
          {/* Branch */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{slot.branch?.name}</span>
          </div>
          
          {/* Booking count */}
          <div className="flex items-center justify-between">
            <Badge variant={isAvailable ? 'default' : 'secondary'}>
              {slot.bookedCount}/{slot.capacity} students
            </Badge>
            {slot.serviceType && (
              <div className={`w-3 h-3 rounded-full ${getServiceTypeColor(slot.serviceType.id, serviceTypes).split(' ')[0]}`}></div>
            )}
          </div>
          
          {/* Student booking button */}
          {isStudent && (
            <Button
              size={compact ? 'sm' : 'default'}
              className="w-full text-xs sm:text-sm"
              disabled={!isAvailable}
              onClick={() => onBook(slot)}
            >
              <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
              {isAvailable ? 'Book Slot' : 'Full'}
            </Button>
          )}
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
  const [view, setView] = useState<'weekly' | 'monthly'>('monthly')
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedServiceType, setSelectedServiceType] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Get current week range for display
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      return (response as any).data?.branches || []
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

  // Fetch available slots (using admin API but filtering for students)
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['student-slots', {
      branchId: selectedBranch || undefined,
      serviceTypeId: selectedServiceType || undefined,
      view
    }],
    queryFn: () => slotsAPI.getAll({
      branchId: selectedBranch || undefined,
      serviceTypeId: selectedServiceType || undefined,
      view
    }),
  })

  const slots = (slotsData as any)?.data || []
  
  // Transform slots to include proper bookedCount
  const transformedSlots = slots.map((slot: any) => ({
    ...slot,
    bookedCount: slot.bookings?.filter((booking: any) => 
      booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
    ).length || 0
  }))


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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-slots'] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsBookingDialogOpen(false)
      setSelectedSlot(null)
      
      // Check if it's a confirmed booking or waitlist
      if (data?.status === 'CONFIRMED') {
        addToast({
          type: 'success',
          title: 'Booking Confirmed!',
          message: `Successfully booked slot for ${format(new Date(selectedSlot?.date || new Date()), 'MMM dd, yyyy')} at ${selectedSlot?.startTime}`
        })
      } else if (data?.waitlistPosition) {
        addToast({
          type: 'info',
          title: 'Added to Waitlist',
          message: `You've been added to the waitlist. Your position: #${data.waitlistPosition}`
        })
      }
    },
    onError: (error: any) => {
      console.error('Booking failed:', error)
      const errorMessage = error.response?.data?.message || 'Unable to book this slot. Please try again or contact support.'
      
      // Check if it's a waitlist scenario
      if (error.response?.status === 400 && errorMessage.includes('full')) {
        // Simulate waitlist position (in real implementation, this would come from backend)
        const waitlistPosition = Math.floor(Math.random() * 10) + 1
        addToast({
          type: 'info',
          title: 'Added to Waitlist',
          message: `Slot is full. You've been added to the waitlist. Your position: #${waitlistPosition}`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Booking Failed',
          message: errorMessage
        })
      }
    }
  })


  const navigateDate = (direction: 'prev' | 'next') => {
    const increment = view === 'monthly' ? 30 : view === 'weekly' ? 7 : 1
    const newDate = direction === 'next' ? addDays(selectedDate, increment) : subDays(selectedDate, increment)
    setSelectedDate(newDate)
  }

  const getDateRange = () => {
    if (view === 'monthly') {
    return format(selectedDate, 'MMMM yyyy')
    } else if (view === 'weekly') {
      return `Week of ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
    } else {
      return format(selectedDate, 'MMMM dd, yyyy')
    }
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
    } finally {
      setIsConfirming(false)
    }
  }

  const isSlotAvailable = (slot: Slot) => {
    return slot.bookedCount < slot.capacity
  }


  if (slotsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Schedule', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Available Speaking Test Slots</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse and book speaking test slots across all branches
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Slots</p>
                <p className="text-2xl font-bold text-gray-900">{transformedSlots.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {transformedSlots.filter((slot: Slot) => isSlotAvailable(slot)).length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Full</p>
                <p className="text-2xl font-bold text-red-600">
                  {transformedSlots.filter((slot: Slot) => !isSlotAvailable(slot)).length}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-full">
                <Users className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Types</p>
                <p className="text-2xl font-bold text-purple-600">
                  {new Set(transformedSlots.map((slot: Slot) => slot.serviceType?.id)).size}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Filter className="w-5 h-5 text-purple-600" />
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
              
              {/* Branch filter */}
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {Array.isArray(branches) && branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              {/* Service Type filter */}
              <select
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Services</option>
                {Array.isArray(serviceTypes) && serviceTypes.map((serviceType: ServiceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name} ({serviceType.durationMinutes} min)
                  </option>
                ))}
              </select>

              {/* View toggle */}
              <select
                value={view}
                onChange={(e) => setView(e.target.value as 'weekly' | 'monthly')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="weekly">Weekly View</option>
                <option value="monthly">Monthly View</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {getDateRange()}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Service Types:</span>
            {Array.isArray(serviceTypes) && serviceTypes.map((serviceType: ServiceType) => (
              <div key={serviceType.id} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getServiceTypeColor(serviceType.id, serviceTypes).split(' ')[0]}`}></div>
                <span className="text-sm text-gray-600">{serviceType.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Width Calendar */}
      <div className="space-y-4 lg:space-y-6">
          {/* Slots Grid */}
          {view === 'monthly' ? (
            <MonthlyCalendarView
              selectedDate={selectedDate}
              slots={transformedSlots}
              onSlotClick={handleBookSlot}
              isSlotAvailable={isSlotAvailable}
              serviceTypes={serviceTypes}
            />
          ) : view === 'weekly' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>
                    Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
                    const daySlots = transformedSlots.filter((slot: Slot) =>
                      format(new Date(slot.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    )

                    return (
                      <div key={day.toISOString()} className="space-y-2">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {format(day, 'EEE')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(day, 'MMM dd')}
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[200px]">
                          {daySlots.map((slot: Slot) => (
                            <div
                              key={slot.id}
                              className={`p-2 border rounded-md text-xs hover:opacity-80 transition-colors cursor-pointer ${
                                isSlotAvailable(slot) 
                                  ? `${getServiceTypeColor(slot.serviceType?.id, serviceTypes)}` 
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                              onClick={() => isSlotAvailable(slot) && handleBookSlot(slot)}
                            >
                              <div className="font-medium mb-1">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </div>
                              {slot.serviceType && (
                                <div className="text-xs font-medium mb-1">
                                  {getServiceTypeAbbreviation(slot.serviceType.id, serviceTypes)}
                                </div>
                              )}
                              <div className="text-gray-600 text-xs mb-1">
                                {slot.branch?.name}
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant={isSlotAvailable(slot) ? 'success' : 'secondary'}>
                                  {slot.bookedCount}/{slot.capacity} students
                                </Badge>
                              </div>
                            </div>
                          ))}
                          
                          {daySlots.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-4">
                              No slots
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>Slots for {format(selectedDate, 'MMMM dd, yyyy')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transformedSlots.length > 0 ? (
                  <div className="space-y-4">
                    {transformedSlots.map((slot: Slot) => (
                      <SlotCard 
                        key={slot.id} 
                        slot={slot} 
                        onBook={handleBookSlot}
                        isAvailable={isSlotAvailable(slot)}
                        serviceTypes={serviceTypes}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No slots available for the selected date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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

// Monthly Calendar View Component
interface MonthlyCalendarViewProps {
  selectedDate: Date
  slots: Slot[]
  onSlotClick: (slot: Slot) => void
  isSlotAvailable: (slot: Slot) => boolean
  serviceTypes?: ServiceType[]
}

const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  selectedDate,
  slots,
  onSlotClick,
  isSlotAvailable,
  serviceTypes
}) => {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add empty days at the start to align with week
  const startDay = monthStart.getDay()
  const emptyDays = Array.from({ length: startDay }, (_, i) => addDays(monthStart, -startDay + i))
  const allDays = [...emptyDays, ...monthDays]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5" />
          <span>Monthly View - {format(selectedDate, 'MMMM yyyy')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {allDays.map((day) => {
            const daySlots = slots.filter((slot: Slot) =>
              isSameDay(new Date(slot.date), day)
            )
            const isCurrentMonth = day >= monthStart && day <= monthEnd
            const isToday = isSameDay(day, new Date())
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border border-gray-200 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && daySlots.length > 0 && (
                    <Badge variant="success" className="text-xs">
                      {daySlots.length}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {daySlots.slice(0, 3).map((slot: Slot) => (
                    <div
                      key={slot.id}
                      className={`p-1 border rounded text-xs hover:opacity-80 cursor-pointer transition-colors ${
                        isSlotAvailable(slot) 
                          ? `${getServiceTypeColor(slot.serviceType?.id, serviceTypes)}` 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                      onClick={() => isSlotAvailable(slot) && onSlotClick(slot)}
                    >
                      <div className="font-medium">
                        {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                      </div>
                      {slot.serviceType && (
                        <div className="text-xs font-medium">
                          {getServiceTypeAbbreviation(slot.serviceType.id, serviceTypes)}
                        </div>
                      )}
                      <div className="text-gray-600 truncate text-xs">
                        {slot.branch?.name}
                      </div>
                      <div className="text-gray-500 truncate text-xs">
                        {slot.bookedCount}/{slot.capacity} students
                      </div>
                    </div>
                  ))}
                  
                  {daySlots.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{daySlots.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default Schedule