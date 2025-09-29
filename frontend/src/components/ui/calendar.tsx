import * as React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, isWeekend } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onSlotClick?: (slot: any) => void
  slots?: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
    capacity: number
    bookedCount: number
    branch?: { name: string }
    teacher?: { name: string }
  }>
  className?: string
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate = new Date(),
  onDateSelect,
  onSlotClick,
  slots = [],
  className = ""
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return slots.filter(slot => slot.date === dateStr)
  }

  const getSlotCount = (date: Date) => {
    return getSlotsForDate(date).length
  }

  const getAvailableSlots = (date: Date) => {
    return getSlotsForDate(date).filter(slot => (slot.bookedCount || 0) < slot.capacity).length
  }

  const getTotalCapacity = (date: Date) => {
    return getSlotsForDate(date).reduce((total, slot) => total + slot.capacity, 0)
  }

  const getTotalBooked = (date: Date) => {
    return getSlotsForDate(date).reduce((total, slot) => total + (slot.bookedCount || 0), 0)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    )
  }

  const handleDateClick = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date)
    }
  }

  const handleSlotClick = (slot: any, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onSlotClick) {
      onSlotClick(slot)
    }
  }

  const getDateStatus = (date: Date) => {
    const slotCount = getSlotCount(date)
    const availableSlots = getAvailableSlots(date)
    const totalCapacity = getTotalCapacity(date)
    const totalBooked = getTotalBooked(date)
    
    if (slotCount === 0) return 'no-slots'
    if (availableSlots === 0) return 'fully-booked'
    if (availableSlots === slotCount) return 'all-available'
    return 'partially-booked'
  }

  return (
    <div className={cn("bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-white/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200 hover:shadow-sm group"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </button>
        
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-white/60 dark:hover:bg-gray-600/60 rounded-lg transition-all duration-200 hover:shadow-sm group"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 py-3">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isCurrentDay = isToday(day)
            const isWeekendDay = isWeekend(day)
            const slotCount = getSlotCount(day)
            const availableSlots = getAvailableSlots(day)
            const totalCapacity = getTotalCapacity(day)
            const totalBooked = getTotalBooked(day)
            const dateStatus = getDateStatus(day)
            const hasSlots = slotCount > 0

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "relative p-3 h-20 text-sm rounded-lg transition-all duration-200",
                  "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "group",
                  !isCurrentMonth && "text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500",
                  isCurrentMonth && "text-gray-900 dark:text-white",
                  isSelected && "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold ring-2 ring-blue-500",
                  isCurrentDay && !isSelected && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium",
                  isWeekendDay && isCurrentMonth && "text-gray-600 dark:text-gray-400",
                  hasSlots && isCurrentMonth && "hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrentDay && "text-blue-600 dark:text-blue-400 font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {isCurrentDay && (
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    )}
                  </div>
                  
                  {hasSlots && isCurrentMonth && (
                    <div className="flex-1 flex flex-col space-y-1 overflow-hidden">
                      {getSlotsForDate(day).slice(0, 3).map((slot, slotIndex) => {
                        const bookedCount = slot.bookedCount || 0
                        const isAvailable = bookedCount < slot.capacity
                        const slotStatus = bookedCount === 0 ? 'available' : 
                                         bookedCount < slot.capacity ? 'partial' : 'full'
                        
                        return (
                          <button
                            key={slot.id}
                            onClick={(e) => handleSlotClick(slot, e)}
                            className={cn(
                              "w-full px-1 py-0.5 rounded text-xs font-medium transition-all duration-200",
                              "hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500",
                              slotStatus === 'available' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50",
                              slotStatus === 'partial' && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
                              slotStatus === 'full' && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{slot.startTime}</span>
                              <span className="text-xs opacity-75">
                                {bookedCount}/{slot.capacity}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                      {getSlotsForDate(day).length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{getSlotsForDate(day).length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover tooltip */}
                {hasSlots && isCurrentMonth && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{slotCount} slot{slotCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-center">
                      {availableSlots} available
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-300">All slots available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-300">Partially booked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-300">Fully booked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-300">Selected date</span>
          </div>
        </div>
      </div>
    </div>
  )
}
