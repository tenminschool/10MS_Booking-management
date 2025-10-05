import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsAPI, usersAPI, branchesAPI } from '@/lib/api'
import { UserRole, type Notification, type User, type Branch } from '@/types'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Tag,
  Shield,
  X
} from 'lucide-react'


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
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only Super Admins can manage notifications across the system.</p>
        </div>
      </div>
    )
  }

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['admin-notifications', { search: searchTerm, type: typeFilter, status: statusFilter }],
    queryFn: async () => {
      const response = await notificationsAPI.getAll({ 
        search: searchTerm, 
        type: typeFilter, 
        status: statusFilter,
        page: 1,
        limit: 1000
      })
      return response
    },
  })

  // Fetch users for targeting
  const { data: usersData } = useQuery({
    queryKey: ['users-for-notifications'],
    queryFn: async () => {
      const response = await usersAPI.getAll({ limit: 1000 })
      return response
    },
  })

  // Fetch branches for targeting
  const { data: branchesData } = useQuery({
    queryKey: ['branches-for-notifications'],
    queryFn: async () => {
      const response = await branchesAPI.getAll()
      return response
    },
  })

  const notifications = (notificationsData as any)?.data?.data || []
  const users = (usersData as any)?.data?.users || []
  const branches = (branchesData as any)?.data?.branches || []

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await notificationsAPI.create(data)
      return response
    },
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await notificationsAPI.update(id, data)
      return response
    },
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
    mutationFn: async (id: string) => {
      const response = await notificationsAPI.delete(id)
      return response
    },
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
    mutationFn: async (id: string) => {
      const response = await notificationsAPI.update(id, { status: 'SENT' })
      return response
    },
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
    if (!notifications || !Array.isArray(notifications)) {
      return { total: 0, sent: 0, scheduled: 0, draft: 0, failed: 0 }
    }
    
    const total = notifications.length
    const sent = notifications.filter((n: Notification) => n.status === 'SENT').length
    const scheduled = notifications.filter((n: Notification) => n.status === 'SCHEDULED').length
    const draft = notifications.filter((n: Notification) => n.status === 'DRAFT').length
    const failed = notifications.filter((n: Notification) => n.status === 'FAILED').length

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

  const filteredNotifications = notifications.filter((notification: Notification) => {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notification Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create, schedule, and manage notifications across all users and branches
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 text-white mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Notification
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Edit className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Draft</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Failed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="SENT">Sent</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="FAILED">Failed</option>
                <option value="DRAFT">Draft</option>
              </select>

              <input
                type="date"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Select date..."
              />
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
              {filteredNotifications.map((notification: Notification) => (
                <div key={notification.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        <Badge className={getStatusColor(notification.status || 'DRAFT')}>
                          {getStatusIcon(notification.status || 'DRAFT')}
                          <span className="ml-1">{notification.status || 'DRAFT'}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        {notification.scheduledAt && (
                          <span>Scheduled: {format(new Date(notification.scheduledAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                        {notification.status === 'SENT' && (
                          <span>Sent: {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                      </div>
                      
                      {notification.tags && notification.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {notification.tags?.map((tag: string, index: number) => (
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
          branches={branches}
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
  branches: Branch[]
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const NotificationFormModal: React.FC<NotificationFormModalProps> = ({
  notification,
  users,
  branches,
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

  // Generate target options for the combobox
  const getTargetOptions = (): Option[] => {
    const options: Option[] = []

    // Group options
    branches.forEach((branch: Branch) => {
      const branchStudents = users.filter((user: User) => 
        user.role === UserRole.STUDENT && user.branchId === branch.id
      )
      const branchAdmins = users.filter((user: User) => 
        user.role === UserRole.BRANCH_ADMIN && user.branchId === branch.id
      )

      if (branchStudents.length > 0) {
        options.push({
          value: `branch_students_${branch.id}`,
          label: `Students of ${branch.name}`,
          type: 'group',
          group: 'branch_students',
          count: branchStudents.length
        })
      }

      if (branchAdmins.length > 0) {
        options.push({
          value: `branch_admins_${branch.id}`,
          label: `Admins of ${branch.name}`,
          type: 'group',
          group: 'branch_admins',
          count: branchAdmins.length
        })
      }
    })

    // All students group
    const students = users.filter((user: User) => user.role === UserRole.STUDENT)
    if (students.length > 0) {
      options.push({
        value: 'all_students',
        label: 'All Students',
        type: 'group',
        group: 'all_students',
        count: students.length
      })
    }

    // All teachers group
    const teachers = users.filter((user: User) => user.role === UserRole.TEACHER)
    if (teachers.length > 0) {
      options.push({
        value: 'all_teachers',
        label: 'All Teachers',
        type: 'group',
        group: 'all_teachers',
        count: teachers.length
      })
    }

    // All super admins group
    const superAdmins = users.filter((user: User) => user.role === UserRole.SUPER_ADMIN)
    if (superAdmins.length > 0) {
      options.push({
        value: 'all_super_admins',
        label: 'All Super Admins',
        type: 'group',
        group: 'all_super_admins',
        count: superAdmins.length
      })
    }

    // Individual users
    users.forEach((user: User) => {
      options.push({
        value: user.id,
        label: `${user.name} (${user.role})`,
        type: 'individual',
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          branch: user.branch
        }
      })
    })

    return options
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {notification ? 'Edit Notification' : 'Create New Notification'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter notification title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              required
              placeholder="Enter notification message"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="REMINDER">Reminder</SelectItem>
                  <SelectItem value="SYSTEM_ALERT">System Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (Optional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Users *</Label>
            <MultiSelectCombobox
              options={getTargetOptions()}
              value={formData.targetUsers}
              onChange={(values: string[]) => setFormData({ ...formData, targetUsers: values })}
              placeholder="Select target users or groups..."
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You can select groups (students by branch, teachers, admins) or individual users. Leave empty to send to all users.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              type="text"
              placeholder="Add a tag and press Enter"
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isUrgent"
              checked={formData.isUrgent}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isUrgent: e.target.checked })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isUrgent" className="text-sm font-medium">
              Mark as urgent (high priority)
            </Label>
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
              variant="destructive"
            >
              {isLoading ? 'Saving...' : (notification ? 'Update Notification' : 'Create Notification')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AdminNotifications
