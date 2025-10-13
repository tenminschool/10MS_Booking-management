import React from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  User,
  MapPin,
  BookOpen,
  X,
  AlertCircle
} from 'lucide-react'
import { BookingStatus } from '@/types'
import type { Booking } from '@/types'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>{children}</div>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-0 ${className}`}>{children}</div>
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

interface BookingCardProps {
  booking: Booking
  isTeacher: boolean
  onCancel: (booking: Booking) => void
  getStatusColor: (status: BookingStatus) => string
  getStatusIcon: (status: BookingStatus) => React.ReactNode
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isTeacher,
  onCancel,
  getStatusColor,
  getStatusIcon
}) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
      <CardContent>
        {/* Header with Status */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {booking.slot?.date && format(new Date(booking.slot.date), 'EEEE, MMMM dd, yyyy')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {booking.slot?.startTime} - {booking.slot?.endTime}
              </p>
            </div>
          </div>
          <Badge variant={getStatusColor(booking.status)} className="flex items-center space-x-1 text-xs px-3 py-1">
            {getStatusIcon(booking.status)}
            <span>{booking.status}</span>
          </Badge>
        </div>

        {/* Main Content */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Student/Teacher Info */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <User className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {isTeacher ? 'Student' : 'Teacher'}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {isTeacher ? booking.student?.name : booking.slot?.teacher?.name}
                </p>
              </div>
            </div>

            {/* Location Info */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Location
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {booking.slot?.branch?.name}
                </p>
              </div>
            </div>

            {/* Service Type & Room */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Service & Room
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {booking.slot?.serviceType && (
                    <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {booking.slot.serviceType.name}
                    </span>
                  )}
                  {booking.slot?.room && (
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                      Room {booking.slot.room.roomNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          {booking.cancellationReason && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Cancellation Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {booking.cancellationReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isTeacher && booking.status === BookingStatus.CONFIRMED && booking.slot && new Date(booking.slot.date) > new Date() && (
            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(booking)}
                className="flex items-center space-x-2 text-sm px-3 py-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4" />
                <span>Cancel Booking</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BookingCard
