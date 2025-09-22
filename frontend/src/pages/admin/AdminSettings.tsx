import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { systemAPI } from '@/lib/api'
import { UserRole } from '@/types'
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Bell, 
  Clock, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

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
      variant === 'ghost' ? 'hover:bg-gray-100' :
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
    variant === 'success' ? 'bg-green-100 text-green-800' :
    variant === 'warning' ? 'bg-yellow-100 text-yellow-800' :
    'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

interface SystemSettings {
  bookingRules: {
    maxBookingsPerMonth: number
    cancellationHours: number
    allowCrossBranchBooking: boolean
    autoReminderHours: number
  }
  notificationTemplates: {
    bookingConfirmed: {
      sms: string
      inApp: string
    }
    bookingReminder: {
      sms: string
      inApp: string
    }
    bookingCancelled: {
      sms: string
      inApp: string
    }
    teacherCancellation: {
      sms: string
      inApp: string
    }
  }
  systemLimits: {
    maxSlotsPerDay: number
    maxStudentsPerSlot: number
    workingHoursStart: string
    workingHoursEnd: string
  }
  auditSettings: {
    retentionDays: number
    logLevel: 'basic' | 'detailed' | 'verbose'
    enableRealTimeAlerts: boolean
  }
}

const AdminSettings: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'booking' | 'notifications' | 'system' | 'audit'>('booking')
  const [hasChanges, setHasChanges] = useState(false)
  
  // Audit logs state
  const [auditLogsPage, setAuditLogsPage] = useState(1)
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  })

  // Only super admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access system settings.</p>
        </div>
      </div>
    )
  }

  // Fetch system settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => systemAPI.getSettings(),
  })

  // Fetch audit logs
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ['audit-logs', auditLogsPage, auditFilters],
    queryFn: () => systemAPI.getAuditLogs({
      page: auditLogsPage,
      limit: 20,
      ...auditFilters
    }),
    enabled: activeTab === 'audit'
  })

  const [settings, setSettings] = useState<SystemSettings>({
    bookingRules: {
      maxBookingsPerMonth: 4,
      cancellationHours: 24,
      allowCrossBranchBooking: true,
      autoReminderHours: 24
    },
    notificationTemplates: {
      bookingConfirmed: {
        sms: 'Your speaking test is confirmed for {date} at {time} with {teacher}. Branch: {branch}. Show this message at reception.',
        inApp: 'Your speaking test booking has been confirmed. Please arrive 10 minutes early.'
      },
      bookingReminder: {
        sms: 'Reminder: Your speaking test is tomorrow at {time} with {teacher}. Branch: {branch}. Please arrive on time.',
        inApp: 'Don\'t forget your speaking test tomorrow at {time}. Good luck!'
      },
      bookingCancelled: {
        sms: 'Your speaking test on {date} at {time} has been cancelled. You can book a new slot anytime.',
        inApp: 'Your booking has been cancelled. You can reschedule from the bookings page.'
      },
      teacherCancellation: {
        sms: 'Sorry, your teacher {teacher} cancelled the session on {date}. Please reschedule at your convenience.',
        inApp: 'Your session was cancelled by the teacher. Priority rescheduling is available for you.'
      }
    },
    systemLimits: {
      maxSlotsPerDay: 20,
      maxStudentsPerSlot: 1,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00'
    },
    auditSettings: {
      retentionDays: 365,
      logLevel: 'detailed',
      enableRealTimeAlerts: true
    }
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: systemAPI.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      setHasChanges(false)
    }
  })

  const handleSettingChange = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
    setHasChanges(true)
  }

  const handleNestedSettingChange = (section: keyof SystemSettings, nestedKey: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedKey]: {
          ...(prev[section] as any)[nestedKey],
          [key]: value
        }
      }
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateSettingsMutation.mutate(settings)
  }

  const handleReset = () => {
    // Reset to original values from server
    if (settingsData?.data) {
      setSettings(settingsData.data)
      setHasChanges(false)
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'booking', name: 'Booking Rules', icon: Calendar },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'system', name: 'System Limits', icon: Settings },
    { id: 'audit', name: 'Audit & Logs', icon: AlertTriangle }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600 mt-1">
            Configure business rules, notification templates, and system settings
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {hasChanges && (
            <Badge variant="warning" className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Unsaved Changes</span>
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || updateSettingsMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettingsMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Booking Rules Tab */}
      {activeTab === 'booking' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Booking Business Rules</span>
              </CardTitle>
              <CardDescription>
                Configure booking limits, cancellation policies, and cross-branch settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Bookings Per Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.bookingRules.maxBookingsPerMonth}
                    onChange={(e) => handleSettingChange('bookingRules', 'maxBookingsPerMonth', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum bookings a student can make per month</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Notice (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={settings.bookingRules.cancellationHours}
                    onChange={(e) => handleSettingChange('bookingRules', 'cancellationHours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum hours before session to allow cancellation</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto Reminder (Hours Before)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={settings.bookingRules.autoReminderHours}
                    onChange={(e) => handleSettingChange('bookingRules', 'autoReminderHours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">When to send automatic reminders</p>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.bookingRules.allowCrossBranchBooking}
                      onChange={(e) => handleSettingChange('bookingRules', 'allowCrossBranchBooking', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Cross-Branch Booking</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Students can book at any branch</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Templates</span>
              </CardTitle>
              <CardDescription>
                Customize SMS and in-app notification messages. Use {'{'}date{'}'}, {'{'}time{'}'}, {'{'}teacher{'}'}, {'{'}branch{'}'} as placeholders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {Object.entries(settings.notificationTemplates).map(([key, templates]) => (
                  <div key={key} className="space-y-4">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          SMS Template
                        </label>
                        <textarea
                          value={templates.sms}
                          onChange={(e) => handleNestedSettingChange('notificationTemplates', key, 'sms', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                          placeholder="SMS message template..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {templates.sms.length}/160 characters
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          In-App Template
                        </label>
                        <textarea
                          value={templates.inApp}
                          onChange={(e) => handleNestedSettingChange('notificationTemplates', key, 'inApp', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          rows={3}
                          placeholder="In-app notification template..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {templates.inApp.length}/200 characters recommended
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Limits Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>System Limits & Constraints</span>
              </CardTitle>
              <CardDescription>
                Configure system-wide limits and operational constraints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Slots Per Day (Per Teacher)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.systemLimits.maxSlotsPerDay}
                    onChange={(e) => handleSettingChange('systemLimits', 'maxSlotsPerDay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Students Per Slot
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={settings.systemLimits.maxStudentsPerSlot}
                    onChange={(e) => handleSettingChange('systemLimits', 'maxStudentsPerSlot', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours Start
                  </label>
                  <input
                    type="time"
                    value={settings.systemLimits.workingHoursStart}
                    onChange={(e) => handleSettingChange('systemLimits', 'workingHoursStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Hours End
                  </label>
                  <input
                    type="time"
                    value={settings.systemLimits.workingHoursEnd}
                    onChange={(e) => handleSettingChange('systemLimits', 'workingHoursEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Settings Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Audit & Logging Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure audit trail settings and system monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audit Log Retention (Days)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="2555"
                    value={settings.auditSettings.retentionDays}
                    onChange={(e) => handleSettingChange('auditSettings', 'retentionDays', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">How long to keep audit logs</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logging Level
                  </label>
                  <select
                    value={settings.auditSettings.logLevel}
                    onChange={(e) => handleSettingChange('auditSettings', 'logLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="basic">Basic</option>
                    <option value="detailed">Detailed</option>
                    <option value="verbose">Verbose</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Amount of detail in audit logs</p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.auditSettings.enableRealTimeAlerts}
                      onChange={(e) => handleSettingChange('auditSettings', 'enableRealTimeAlerts', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Real-Time Security Alerts</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Send immediate notifications for suspicious activities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Database</div>
                    <div className="text-sm text-green-700">Connected</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">SMS Service</div>
                    <div className="text-sm text-green-700">Active</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Audit Logs</div>
                    <div className="text-sm text-green-700">Recording</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Viewer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Audit Logs</span>
              </CardTitle>
              <CardDescription>
                View and filter system audit logs for security monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                    <select
                      value={auditFilters.action}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, action: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={auditFilters.startDate}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={auditFilters.endDate}
                      onChange={(e) => setAuditFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      onClick={() => setAuditFilters({ action: '', userId: '', startDate: '', endDate: '' })}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>

              {/* Audit Logs Table */}
              {auditLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading audit logs...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Timestamp</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">User</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Entity</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Entity ID</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogsData?.auditLogs?.map((log: any) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              <div>
                                <div className="font-medium">{log.user?.name || 'Unknown'}</div>
                                <div className="text-gray-500 text-xs">{log.user?.role}</div>
                              </div>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono">
                              {log.entityType}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                              {log.entityId?.substring(0, 8)}...
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm font-mono text-gray-600">
                              {log.ipAddress || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {auditLogsData?.pagination && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((auditLogsData.pagination.page - 1) * auditLogsData.pagination.limit) + 1} to{' '}
                        {Math.min(auditLogsData.pagination.page * auditLogsData.pagination.limit, auditLogsData.pagination.total)} of{' '}
                        {auditLogsData.pagination.total} entries
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setAuditLogsPage(prev => Math.max(1, prev - 1))}
                          disabled={auditLogsPage <= 1}
                          variant="outline"
                          size="sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        <span className="text-sm text-gray-700">
                          Page {auditLogsPage} of {auditLogsData.pagination.pages}
                        </span>
                        
                        <Button
                          onClick={() => setAuditLogsPage(prev => Math.min(auditLogsData.pagination.pages, prev + 1))}
                          disabled={auditLogsPage >= auditLogsData.pagination.pages}
                          variant="outline"
                          size="sm"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {(!auditLogsData?.auditLogs || auditLogsData.auditLogs.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No audit logs found matching the current filters.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AdminSettings