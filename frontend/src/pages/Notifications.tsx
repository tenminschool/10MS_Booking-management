import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { notificationsAPI } from '@/lib/api'
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
const CardDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
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
import { 
  Bell, 
  BookOpen, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Trash2,
  MarkAsRead,
  Plus,
  Calendar,
  GraduationCap
} from 'lucide-react'
import { format } from 'date-fns'
import { Notification, NotificationType } from '@/types'

const Notifications: React.FC = () => {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getMy(),
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_CONFIRMED:
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case NotificationType.BOOKING_REMINDER:
        return <Clock className="w-5 h-5 text-yellow-600" />
      case NotificationType.BOOKING_CANCELLED:
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case NotificationType.SYSTEM_ALERT:
        return <Bell className="w-5 h-5 text-blue-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationBgColor = (type: NotificationType, isRead: boolean) => {
    if (isRead) return 'bg-gray-50'
    
    switch (type) {
      case NotificationType.BOOKING_CONFIRMED:
        return 'bg-green-50 border-green-200'
      case NotificationType.BOOKING_REMINDER:
        return 'bg-yellow-50 border-yellow-200'
      case NotificationType.BOOKING_CANCELLED:
        return 'bg-red-50 border-red-200'
      case NotificationType.SYSTEM_ALERT:
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const filterNotifications = (notifications: Notification[]) => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead)
      case 'read':
        return notifications.filter(n => n.isRead)
      default:
        return notifications
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const allNotifications = notifications?.data || []
  const filteredNotifications = filterNotifications(allNotifications)
  const unreadCount = allNotifications.filter(n => !n.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Bell className="w-6 h-6" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-gray-600">Stay updated with your booking activities</p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={filter === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({allNotifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </Button>
        <Button
          variant={filter === 'read' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilter('read')}
        >
          Read ({allNotifications.length - unreadCount})
        </Button>
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-all hover:shadow-md ${
                  getNotificationBgColor(notification.type, notification.isRead)
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-700 mb-3">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>
                              {format(new Date(notification.createdAt), 'MMM dd, yyyy h:mm a')}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {notification.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      {!notification.isRead && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Read
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 
                   filter === 'read' ? 'No read notifications' : 'No notifications yet'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {filter === 'all' 
                    ? 'You\'ll receive notifications about your bookings and system updates here'
                    : `Switch to "${filter === 'unread' ? 'all' : 'unread'}" to see other notifications`}
                </p>
                {filter === 'all' && (
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
          {/* Notification Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-medium">{allNotifications.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Unread</span>
                  <Badge variant={unreadCount > 0 ? 'destructive' : 'secondary'}>
                    {unreadCount}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Read</span>
                  <span className="font-medium">{allNotifications.length - unreadCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="flex-1">Booking Confirmed</span>
                  <span className="text-gray-500">
                    {allNotifications.filter(n => n.type === NotificationType.BOOKING_CONFIRMED).length}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="flex-1">Booking Reminder</span>
                  <span className="text-gray-500">
                    {allNotifications.filter(n => n.type === NotificationType.BOOKING_REMINDER).length}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="flex-1">Booking Cancelled</span>
                  <span className="text-gray-500">
                    {allNotifications.filter(n => n.type === NotificationType.BOOKING_CANCELLED).length}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="flex-1">System Alert</span>
                  <span className="text-gray-500">
                    {allNotifications.filter(n => n.type === NotificationType.SYSTEM_ALERT).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link to="/schedule">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Book New Test
                  </Button>
                </Link>
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
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Booking Reminders</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>System Updates</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Score Notifications</span>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">About Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  You'll receive notifications for booking confirmations, reminders, and important updates.
                </p>
                <p>
                  Reminders are sent 24 hours and 1 hour before your test.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Notifications