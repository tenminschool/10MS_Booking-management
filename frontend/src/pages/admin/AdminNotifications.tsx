import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsAPI, usersAPI } from '@/lib/api'
import { UserRole, type Notification, type User } from '@/types'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Tag,
  Calendar,
  Eye,
  BarChart3,
  AlertTriangle,
  Shield,
  Mail,
  MessageSquare,
  Zap,
  Settings
} from 'lucide-react'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>{children}</div>
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
const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pt-0">{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-red-600 text-white hover:bg-red-700' :
      variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white' :
      variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600' :
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
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
    variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  }`}>
    {children}
  </span>
)

const AdminNotifications: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)

  // Only super admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only Super Admins can manage notifications across the system.</p>
        </div>
      </div>
    )
  }

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['admin-notifications', { search: searchTerm, type: typeFilter, status: statusFilter }],
    queryFn: () => notificationsAPI.getMy(),
  })

  // Fetch users for targeting
  const { data: usersData } = useQuery({
    queryKey: ['users-for-notifications'],
    queryFn: () => usersAPI.getAll({ limit: 1000 }),
  })

  const notifications = notificationsData?.data || []
  const users = usersData?.data?.users || []

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: notificationsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      setShowCreateForm(false)
      successToast('Notification created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create notification')
    }
  })

  // Update notification mutation
  const updateNotificationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => notificationsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      setEditingNotification(null)
      successToast('Notification updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update notification')
    }
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: notificationsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      successToast('Notification deleted successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to delete notification')
    }
  })

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationsAPI.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      successToast('Notification sent successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to send notification')
    }
  })

  const handleCreateNotification = (notificationData: any) => {
    createNotificationMutation.mutate(notificationData)
  }

  const handleUpdateNotification = (notificationData: any) => {
    if (editingNotification) {
      updateNotificationMutation.mutate({
        id: editingNotification.id,
        data: notificationData
      })
    }
  }

  const handleDeleteNotification = (notificationId: string) => {
    if (confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      deleteNotificationMutation.mutate(notificationId)
    }
  }

  const handleSendNotification = (notificationId: string) => {
    if (confirm('Are you sure you want to send this notification now?')) {
      sendNotificationMutation.mutate(notificationId)
    }
  }

  const getNotificationStats = () => {
    const total = notifications.length
    const sent = notifications.filter(n => n.status === 'SENT').length
    const scheduled = notifications.filter(n => n.status === 'SCHEDULED').length
    const draft = notifications.filter(n => n.status === 'DRAFT').length
    const failed = notifications.filter(n => n.status === 'FAILED').length

    return { total, sent, scheduled, draft, failed }
  }

  const stats = getNotificationStats()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'SCHEDULED':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'DRAFT':
        return <Edit className="w-4 h-4 text-gray-500" />
      default:
        return <Bell className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800'
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return 'bg-blue-100 text-blue-800'
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800'
      case 'REMINDER':
        return 'bg-yellow-100 text-yellow-800'
      case 'SYSTEM_ALERT':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !typeFilter || notification.type === typeFilter
    const matchesStatus = !statusFilter || notification.status === statusFilter
    
    return matchesSearch && matchesType && matchesStatus
  })

  if (notificationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'Notification Management', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comprehensive Notification Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create, schedule, and manage notifications across all users and branches
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Notification
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Edit className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-64"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="URGENT">Urgent</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="REMINDER">Reminder</option>
                <option value="SYSTEM_ALERT">System Alert</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="SENT">Sent</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="FAILED">Failed</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              {filteredNotifications.length} notifications found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications ({filteredNotifications.length})</span>
          </CardTitle>
          <CardDescription>
            Manage all system notifications and communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No notifications found</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create First Notification
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {getStatusIcon(notification.status)}
                          <span className="ml-1">{notification.status}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        {notification.scheduledAt && (
                          <span>Scheduled: {format(new Date(notification.scheduledAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                        {notification.sentAt && (
                          <span>Sent: {format(new Date(notification.sentAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                      </div>
                      
                      {notification.tags && notification.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {notification.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendNotification(notification.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send Now
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNotification(notification)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Notification Modal */}
      {(showCreateForm || editingNotification) && (
        <NotificationFormModal
          notification={editingNotification}
          users={users}
          onSubmit={editingNotification ? handleUpdateNotification : handleCreateNotification}
          onClose={() => {
            setShowCreateForm(false)
            setEditingNotification(null)
          }}
          isLoading={createNotificationMutation.isPending || updateNotificationMutation.isPending}
        />
      )}
    </div>
  )
}

// Notification Form Modal Component
interface NotificationFormModalProps {
  notification?: Notification | null
  users: User[]
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const NotificationFormModal: React.FC<NotificationFormModalProps> = ({
  notification,
  users,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    title: notification?.title || '',
    message: notification?.message || '',
    type: notification?.type || 'ANNOUNCEMENT',
    targetUsers: notification?.targetUsers || [],
    scheduledAt: notification?.scheduledAt ? format(new Date(notification.scheduledAt), 'yyyy-MM-dd\'T\'HH:mm') : '',
    tags: notification?.tags || [],
    isUrgent: notification?.isUrgent || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {notification ? 'Edit Notification' : 'Create New Notification'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="Enter notification title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              required
              placeholder="Enter notification message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="URGENT">Urgent</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="REMINDER">Reminder</option>
                <option value="SYSTEM_ALERT">System Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Users
            </label>
            <select
              multiple
              value={formData.targetUsers}
              onChange={(e) => {
                const selectedUsers = Array.from(e.target.selectedOptions, option => option.value)
                setFormData({ ...formData, targetUsers: selectedUsers })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              size={5}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role}) - {user.branch?.name || 'No Branch'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Hold Ctrl/Cmd to select multiple users. Leave empty to send to all users.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add a tag and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isUrgent"
              checked={formData.isUrgent}
              onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isUrgent" className="text-sm font-medium text-gray-700">
              Mark as urgent (high priority)
            </label>
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
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Saving...' : (notification ? 'Update Notification' : 'Create Notification')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminNotifications
