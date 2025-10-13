import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react'
import { type Notification } from '@/types'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
)
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 pb-3 sm:pb-4 ${className}`}>{children}</div>
)
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 sm:p-6 pt-0 ${className}`}>{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm sm:text-base ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' :
      'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
    } ${size === 'sm' ? 'px-2 sm:px-3 py-1 text-xs sm:text-sm' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
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
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  } ${className}`}>
    {children}
  </span>
)

interface NotificationsCarouselProps {
  notifications: Notification[]
  unreadCount: number
  title?: string
  showViewAll?: boolean
}

const NotificationsCarousel: React.FC<NotificationsCarouselProps> = ({
  notifications,
  unreadCount,
  title = "Notifications",
  showViewAll = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goToPrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const goToNext = () => {
    setCurrentIndex(Math.min(notifications.length - 1, currentIndex + 1))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'booking_reminder':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'booking_cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Bell className="w-4 h-4 text-blue-600" />
    }
  }

  const getNotificationIconBg = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return 'bg-green-100 dark:bg-green-900/20'
      case 'booking_reminder':
        return 'bg-yellow-100'
      case 'booking_cancelled':
        return 'bg-red-100 dark:bg-red-900/20'
      default:
        return 'bg-blue-100 dark:bg-blue-900/20'
    }
  }

  if (!notifications.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentNotification = notifications[currentIndex]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>{title}</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Single Notification Display */}
          <div 
            className={`p-4 rounded-lg border text-sm ${
              !currentNotification.isRead ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-1.5 rounded-full ${getNotificationIconBg(currentNotification.type)}`}>
                {getNotificationIcon(currentNotification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{currentNotification.title}</p>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm leading-relaxed">
                  {currentNotification.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {format(new Date(currentNotification.createdAt), 'MMM dd, h:mm a')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          {notifications.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
              
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentIndex + 1} of {notifications.length}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNext}
                disabled={currentIndex === notifications.length - 1}
                className="flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  )
}

export default NotificationsCarousel
