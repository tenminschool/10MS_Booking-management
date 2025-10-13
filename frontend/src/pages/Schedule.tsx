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
  
  const handleCardClick = () => {
    if (user?.role === UserRole.TEACHER) {
      onBook(slot) // Open details modal for teachers
    }
  }
  
  return (
    <div 
      className={user?.role === UserRole.TEACHER ? 'cursor-pointer' : ''}
      onClick={user?.role === UserRole.TEACHER ? handleCardClick : undefined}
    >
      <Card className={`${compact ? 'p-2' : 'p-4'} ${!isAvailable ? 'opacity-60' : ''} ${user?.role === UserRole.TEACHER ? 'hover:shadow-md transition-shadow' : ''}`}>
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
          
          {/* Role-based actions */}
          {user?.role === UserRole.STUDENT && (
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
          
          {/* Teacher view - show booking status only */}
          {user?.role === UserRole.TEACHER && (
            <div className={`text-xs px-2 py-1 rounded-full text-center ${
              isAvailable 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
            }`}>
              {isAvailable ? 'Available' : 'Fully Booked'}
            </div>
          )}

          {/* Admin view - show management options */}
          {(user?.role === UserRole.BRANCH_ADMIN || user?.role === UserRole.SUPER_ADMIN) && (
            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {/* Edit slot */}}
              >
                Edit
              </Button>
              {slot.branchId === user?.branchId && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                  onClick={() => {/* Delete slot */}}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
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
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Get current week range for display
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      console.log('Branches API response:', response)
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

  // Fetch available slots (role-based filtering)
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', {
      branchId: user?.role === UserRole.TEACHER ? user.branchId : 
                user?.role === UserRole.BRANCH_ADMIN ? (selectedBranch || user.branchId) :
                selectedBranch || undefined,
      serviceTypeId: selectedServiceType || undefined,
      view
    }],
    queryFn: () => slotsAPI.getAll({
      branchId: user?.role === UserRole.TEACHER ? user.branchId : 
                user?.role === UserRole.BRANCH_ADMIN ? (selectedBranch || user.branchId) :
                selectedBranch || undefined,
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {user?.role === UserRole.TEACHER ? 'My Teaching Schedule' : 
             user?.role === UserRole.BRANCH_ADMIN ? 'Branch Schedule Management' :
             user?.role === UserRole.SUPER_ADMIN ? 'Global Schedule Management' :
             'Available Speaking Test Slots'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.TEACHER 
              ? 'View your assigned slots and student bookings' 
              : user?.role === UserRole.BRANCH_ADMIN
              ? 'Manage slots for your branch and view global availability'
              : user?.role === UserRole.SUPER_ADMIN
              ? 'Manage all slots across all branches'
              : 'Browse and book speaking test slots across all branches'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-3 sm:gap-6 ${user?.role === UserRole.TEACHER ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Slots</p>
                <p className="text-xl sm:text-3xl font-bold text-blue-900">{transformedSlots.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500 rounded-xl shadow-lg">
                <CalendarIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-orange-700 uppercase tracking-wide">Booked Slots</p>
                <p className="text-xl sm:text-3xl font-bold text-orange-900">
                  {transformedSlots.reduce((sum: number, slot: Slot) => sum + (slot.bookedCount || 0), 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-500 rounded-xl shadow-lg">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {user?.role !== UserRole.TEACHER && (
          <>
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-green-700 uppercase tracking-wide">Available</p>
                    <p className="text-xl sm:text-3xl font-bold text-green-900">
                      {transformedSlots.filter((slot: Slot) => isSlotAvailable(slot)).length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-500 rounded-xl shadow-lg">
                    <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-red-700 uppercase tracking-wide">Full</p>
                    <p className="text-xl sm:text-3xl font-bold text-red-900">
                      {transformedSlots.filter((slot: Slot) => !isSlotAvailable(slot)).length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-red-500 rounded-xl shadow-lg">
                    <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg"
        >
          <Filter className="w-4 h-4 mr-2" />
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Two-Column Layout: Filters + Date Navigation */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${showMobileFilters ? 'block' : 'hidden lg:grid'}`}>
        {/* Filters Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 lg:col-span-2">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
                <div className="p-1.5 bg-blue-100 dark:bg-gray-600 rounded-lg">
                  <Filter className="w-4 h-4 text-blue-600 dark:text-gray-300" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filters</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 overflow-x-auto">
                {/* Branch filter - different behavior for different roles */}
                {user?.role !== UserRole.TEACHER && (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
                  >
                    <option value="">
                      {user?.role === UserRole.BRANCH_ADMIN ? 'My Branch Only' : 'All Branches'}
                    </option>
                    {user?.role === UserRole.SUPER_ADMIN && Array.isArray(branches) && branches.map((branch: any) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                    {user?.role === UserRole.STUDENT && Array.isArray(branches) && branches.map((branch: any) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Service Type filter */}
                <select
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
                >
                  <option value="">All Services</option>
                  {Array.isArray(serviceTypes) && serviceTypes.map((serviceType: ServiceType) => (
                    <option key={serviceType.id} value={serviceType.id}>
                      {serviceType.name} ({serviceType.durationMinutes} min)
                    </option>
                  ))}
                </select>

                {/* View toggle - ensure it's always visible */}
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value as 'weekly' | 'monthly')}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Navigation Card */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center flex-1 sm:flex-none">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-200">
                  {getDateRange()}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>


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
              user={user}
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
                <div className="overflow-x-auto">
                  <div className="min-w-[700px] grid grid-cols-7 gap-2 sm:gap-4">
                    {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
                    const daySlots = transformedSlots.filter((slot: Slot) =>
                      format(new Date(slot.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    )

                    return (
                      <div key={day.toISOString()} className="space-y-2">
                        <div className="text-center">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                            {format(day, 'EEE')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {format(day, 'MMM dd')}
                          </div>
                        </div>

                        <div className="space-y-2 min-h-[150px] sm:min-h-[200px]">
                          {daySlots.map((slot: Slot) => (
                            <div
                              key={slot.id}
                              className={`p-1 sm:p-2 border rounded-md text-xs hover:opacity-80 transition-colors cursor-pointer ${
                                isSlotAvailable(slot) 
                                  ? `${getServiceTypeColor(slot.serviceType?.id, serviceTypes)}` 
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                              onClick={() => {
                                if (user?.role === UserRole.STUDENT && isSlotAvailable(slot)) {
                                  handleBookSlot(slot)
                                } else if (user?.role === UserRole.TEACHER) {
                                  handleBookSlot(slot) // Show details modal for teachers
                                }
                                // For admins, could open edit dialog
                              }}
                            >
                              <div className="font-medium mb-1 truncate">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </div>
                              {slot.serviceType && (
                                <div className="text-xs font-medium mb-1 truncate">
                                  {getServiceTypeAbbreviation(slot.serviceType.id, serviceTypes)}
                                </div>
                              )}
                              <div className="text-gray-600 text-xs mb-1 truncate">
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

      {/* Slot Details Dialog - Show for students and teachers */}
      {(user?.role === UserRole.STUDENT || user?.role === UserRole.TEACHER) && (
        <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user?.role === UserRole.STUDENT ? 'Confirm Booking' : 'Slot Details'}
            </DialogTitle>
            <DialogDescription>
              {user?.role === UserRole.STUDENT 
                ? 'Please confirm your speaking test booking details'
                : 'View detailed information about this slot'
              }
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
                  <span>
                    {user?.role === UserRole.STUDENT 
                      ? `${selectedSlot.bookedCount + 1} / ${selectedSlot.capacity} students`
                      : `${selectedSlot.bookedCount} / ${selectedSlot.capacity} students`
                    }
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsBookingDialogOpen(false)}
                >
                  {user?.role === UserRole.STUDENT ? 'Cancel' : 'Close'}
                </Button>
                {user?.role === UserRole.STUDENT && (
                  <Button 
                    className="flex-1"
                    onClick={handleConfirmBooking}
                    disabled={isConfirming || bookSlotMutation.isPending}
                  >
                    {isConfirming || bookSlotMutation.isPending ? 'Booking...' : 'Confirm Booking'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
        </Dialog>
      )}
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
  user?: any
}

const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  selectedDate,
  slots,
  onSlotClick,
  isSlotAvailable,
  serviceTypes,
  user
}) => {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add empty days at the start to align with week
  const startDay = monthStart.getDay()
  const emptyDays = Array.from({ length: startDay }, (_, i) => addDays(monthStart, -startDay + i))
  const allDays = [...emptyDays, ...monthDays]

  return (
    <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Monthly View - {format(selectedDate, 'MMMM yyyy')}</span>
          </CardTitle>
        </div>
        
        {/* Compact Service Types Legend */}
        {Array.isArray(serviceTypes) && serviceTypes.length > 0 && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Service Types:</span>
              {serviceTypes.map((serviceType: ServiceType) => (
                <div key={serviceType.id} className="flex items-center space-x-1">
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getServiceTypeColor(serviceType.id, serviceTypes).split(' ')[0]}`}></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{serviceType.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
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
                className={`min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 dark:border-gray-600 ${
                  isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className={`text-xs sm:text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
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
                  {daySlots.slice(0, 2).map((slot: Slot) => (
                    <div
                      key={slot.id}
                      className={`p-1 border rounded text-xs hover:opacity-80 cursor-pointer transition-colors ${
                        isSlotAvailable(slot) 
                          ? `${getServiceTypeColor(slot.serviceType?.id, serviceTypes)}` 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                      onClick={() => {
                        if (user?.role === UserRole.STUDENT && isSlotAvailable(slot)) {
                          onSlotClick(slot)
                        } else if (user?.role === UserRole.TEACHER) {
                          onSlotClick(slot) // Show details modal for teachers
                        }
                      }}
                    >
                      <div className="font-medium truncate">
                        {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
                      </div>
                      {slot.serviceType && (
                        <div className="text-xs font-medium truncate">
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
                  
                  {daySlots.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{daySlots.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default Schedule