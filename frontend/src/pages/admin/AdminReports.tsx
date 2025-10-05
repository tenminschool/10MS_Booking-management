import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { reportsAPI, branchesAPI } from '@/lib/api'
import { UserRole } from '@/types'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  PieChart
} from 'lucide-react'

// Type definitions
interface ReportFilters {
  startDate: string
  endDate: string
  branchId?: string
  teacherId?: string
  reportType: 'overview' | 'attendance' | 'utilization' | 'assessments'
}

interface Branch {
  id: string
  name: string
}

interface ReportData {
  totalBookings?: number
  bookingGrowth?: number
  attendanceRate?: number
  utilizationRate?: number
  availableSlots?: number
  noShowRate?: number
  branchPerformance?: Array<{
    name: string
    bookings: number
    slots: number
    utilizationRate: number
    attendanceRate: number
  }>
  attendanceDetails?: Array<{
    studentName: string
    attended: boolean
    date: string
    teacherName: string
    slotTime: string
  }>
  utilizationDetails?: Array<{
    teacherName: string
    utilizationRate: number
    date: string
    timeSlot: string
    bookedCount: number
    capacity: number
  }>
  assessmentSummary?: {
    averageScore: number
    totalAssessments: number
    highestScore: number
    improvementRate: number
  }
  recentAssessments?: Array<{
    studentName: string
    score: number
    teacherName: string
    assessedAt: string
    remarks: string
  }>
}

interface AnalyticsData {
  growth?: {
    bookingGrowth: number
    attendanceGrowth: number
  }
  peakHours?: Array<{
    time: string
    bookings: number
    utilizationRate: number
  }>
  teacherPerformance?: Array<{
    name: string
    totalSessions: number
    utilizationRate: number
    attendanceRate: number
  }>
}

interface RealTimeData {
  todayMetrics?: {
    bookings: number
    attendance: number
    activeSlots: number
    pendingBookings: number
  }
  recentActivity?: Array<{
    type: string
    description: string
    branchName: string
    timestamp: string
  }>
  systemAlerts?: Array<{
    type: string
    message: string
    timestamp: string
  }>
}

interface NoShowData {
  summary?: {
    totalNoShows: number
    averageNoShowsPerStudent: number
  }
  patterns?: {
    repeatOffenders: Array<{
      name: string
      phoneNumber: string
      noShowCount: number
    }>
  }
  recommendations?: string[]
}

// Mock UI components with proper TypeScript types
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm ${className}`}>{children}</div>
)

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-6 pb-4 ${className}`}>{children}</div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>
)

const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{children}</p>
)

const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pt-0">{children}</div>
)

interface ButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'destructive' | 'ghost'
  size?: 'default' | 'sm'
  disabled?: boolean
  onClick?: () => void
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  onClick
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors'
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    destructive: 'bg-orange-500 text-white hover:bg-orange-600',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
  }
  const sizeClasses = {
    default: '',
    sm: 'px-3 py-1 text-sm'
  }
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}

const AdminReports: React.FC = () => {
  const { user } = useAuth()
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
    reportType: 'overview'
  })

  // Fetch report data with proper error handling
  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery<ReportData>({
    queryKey: ['admin-reports', filters],
    queryFn: async (): Promise<ReportData> => {
      try {
        const response = await reportsAPI.getReports(filters)
        return (response as any).data as ReportData
      } catch (error) {
        console.error('Failed to fetch reports:', error)
        return {} as ReportData
      }
    },
  })

  // Fetch analytics data
  const { data: analyticsData } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics', filters.branchId],
    queryFn: async (): Promise<AnalyticsData> => {
      try {
        const response = await reportsAPI.getAnalytics({ branchId: filters.branchId })
        return (response as any).data as AnalyticsData
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        return {} as AnalyticsData
      }
    },
    enabled: filters.reportType === 'overview'
  })

  // Fetch real-time metrics
  const { data: realTimeData } = useQuery<RealTimeData>({
    queryKey: ['real-time-metrics', filters.branchId],
    queryFn: async (): Promise<RealTimeData> => {
      try {
        const response = await reportsAPI.getRealTimeMetrics({ branchId: filters.branchId })
        return (response as any).data as RealTimeData
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error)
        return {} as RealTimeData
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: filters.reportType === 'overview'
  })

  // Fetch no-show analysis
  const { data: noShowData } = useQuery<NoShowData>({
    queryKey: ['no-show-analysis', filters.branchId],
    queryFn: async (): Promise<NoShowData> => {
      try {
        const response = await reportsAPI.getNoShowAnalysis({ branchId: filters.branchId, days: 30 })
        return (response as any).data as NoShowData
      } catch (error) {
        console.error('Failed to fetch no-show analysis:', error)
        return {} as NoShowData
      }
    },
    enabled: filters.reportType === 'overview'
  })

  // Fetch branches (for super admin)
  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      try {
        const response = await branchesAPI.getAll()
        return (response as any).data as Branch[]
      } catch (error) {
        console.error('Failed to fetch branches:', error)
        return [] as Branch[]
      }
    },
    enabled: user?.role === UserRole.SUPER_ADMIN
  })

  // Safe data extraction with defaults
  const branches = branchesData || []
  const reports = reportData || {}
  const analytics = analyticsData || {}
  const realTime = realTimeData || {}
  const noShowAnalysis = noShowData || {}

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    try {
      const response = await reportsAPI.exportReports({ ...filters, format: exportFormat })

      // Create download link
      const blob = new Blob([(response as any).data], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/pdf'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Loading state
  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  // Error state
  if (reportError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load reports. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.SUPER_ADMIN
              ? 'System-wide reporting and analytics across all branches'
              : `Comprehensive reporting and analytics dashboard for ${user?.branchId || 'your branch'}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              {/* Date Range */}
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Branch filter (Super Admin only) */}
              {user?.role === UserRole.SUPER_ADMIN && (
                <select
                  value={filters.branchId || ''}
                  onChange={(e) => setFilters({ ...filters, branchId: e.target.value || undefined })}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Report Type Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
              {(['overview', 'attendance', 'utilization', 'assessments'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, reportType: type })}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filters.reportType === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      {filters.reportType === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.totalBookings || 0}</div>
                <p className="text-xs text-gray-500">
                  +{reports.bookingGrowth || 0}% from last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.attendanceRate ? `${Math.round(reports.attendanceRate)}%` : '0%'}
                </div>
                <p className="text-xs text-gray-500">
                  {(reports.attendanceRate || 0) > 80 ? 'Excellent' : (reports.attendanceRate || 0) > 60 ? 'Good' : 'Needs improvement'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Slot Utilization</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.utilizationRate ? `${Math.round(reports.utilizationRate)}%` : '0%'}
                </div>
                <p className="text-xs text-gray-500">
                  {reports.availableSlots || 0} slots available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.noShowRate ? `${Math.round(reports.noShowRate)}%` : '0%'}
                </div>
                <p className="text-xs text-gray-500">
                  {(reports.noShowRate || 0) < 10 ? 'Excellent' : (reports.noShowRate || 0) < 20 ? 'Good' : 'High'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Metrics */}
          {realTime.todayMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Today's Live Metrics</span>
                  <Badge variant="secondary">Live</Badge>
                </CardTitle>
                <CardDescription>
                  Real-time data updated every 30 seconds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-md">
                    <div className="text-xl font-bold text-blue-600">
                      {realTime.todayMetrics.bookings}
                    </div>
                    <div className="text-sm text-blue-800">Today's Bookings</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-md">
                    <div className="text-xl font-bold text-green-600">
                      {realTime.todayMetrics.attendance}
                    </div>
                    <div className="text-sm text-green-800">Attended Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-md">
                    <div className="text-xl font-bold text-purple-600">
                      {realTime.todayMetrics.activeSlots}
                    </div>
                    <div className="text-sm text-purple-800">Active Slots</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-md">
                    <div className="text-xl font-bold text-orange-600">
                      {realTime.todayMetrics.pendingBookings}
                    </div>
                    <div className="text-sm text-orange-800">Pending Sessions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Insights */}
          {analytics.growth && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Growth Analytics</span>
                  </CardTitle>
                  <CardDescription>
                    Month-over-month performance comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">Booking Growth</p>
                        <p className="text-sm text-gray-600">vs. last month</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${analytics.growth.bookingGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {analytics.growth.bookingGrowth >= 0 ? '+' : ''}{analytics.growth.bookingGrowth}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">Attendance Growth</p>
                        <p className="text-sm text-gray-600">vs. last month</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${analytics.growth.attendanceGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                          {analytics.growth.attendanceGrowth >= 0 ? '+' : ''}{analytics.growth.attendanceGrowth}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Peak Hours Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Most popular booking time slots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.peakHours && analytics.peakHours.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.peakHours.slice(0, 5).map((hour, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{hour.time}</p>
                            <p className="text-sm text-gray-600">{hour.bookings} bookings</p>
                          </div>
                          <Badge variant={hour.utilizationRate > 80 ? 'success' : hour.utilizationRate > 60 ? 'warning' : 'secondary'}>
                            {Math.round(hour.utilizationRate)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No peak hours data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teacher Performance & No-Show Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Top Performing Teachers</span>
                </CardTitle>
                <CardDescription>
                  Based on utilization and attendance rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.teacherPerformance && analytics.teacherPerformance.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.teacherPerformance.slice(0, 5).map((teacher, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium">{teacher.name}</p>
                          <p className="text-sm text-gray-600">{teacher.totalSessions} sessions</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={teacher.utilizationRate > 80 ? 'success' : teacher.utilizationRate > 60 ? 'warning' : 'secondary'}>
                            {Math.round(teacher.utilizationRate)}% utilization
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {Math.round(teacher.attendanceRate)}% attendance
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No teacher performance data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>No-Show Analysis</span>
                </CardTitle>
                <CardDescription>
                  Patterns and insights for accountability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {noShowAnalysis.summary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-red-50 rounded-md">
                        <div className="text-xl font-bold text-red-600">
                          {noShowAnalysis.summary.totalNoShows || 0}
                        </div>
                        <div className="text-sm text-red-800">Total No-Shows</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-md">
                        <div className="text-xl font-bold text-orange-600">
                          {noShowAnalysis.summary.averageNoShowsPerStudent || 0}
                        </div>
                        <div className="text-sm text-orange-800">Avg per Student</div>
                      </div>
                    </div>

                    {/* Repeat Offenders */}
                    {noShowAnalysis.patterns?.repeatOffenders && noShowAnalysis.patterns.repeatOffenders.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Repeat Offenders</h5>
                        <div className="space-y-2">
                          {noShowAnalysis.patterns.repeatOffenders.slice(0, 3).map((student, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <div>
                                <p className="font-medium text-sm">{student.name}</p>
                                <p className="text-xs text-gray-600">{student.phoneNumber}</p>
                              </div>
                              <Badge variant="destructive">
                                {student.noShowCount} no-shows
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {noShowAnalysis.recommendations && noShowAnalysis.recommendations.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                        <ul className="space-y-1">
                          {noShowAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No no-show analysis data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Branch Performance */}
          {reports.branchPerformance && reports.branchPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5" />
                  <span>Branch Performance Comparison</span>
                </CardTitle>
                <CardDescription>
                  Comparative performance metrics across all branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.branchPerformance.map((branch, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium">{branch.name}</p>
                        <p className="text-sm text-gray-500">{branch.bookings} bookings • {branch.slots} slots</p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={branch.utilizationRate > 80 ? 'success' : branch.utilizationRate > 60 ? 'warning' : 'destructive'}>
                          {Math.round(branch.utilizationRate)}% utilization
                        </Badge>
                        <div className="text-xs text-gray-500">
                          {Math.round(branch.attendanceRate || 0)}% attendance
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {realTime.recentActivity && realTime.recentActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest booking and cancellation activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {realTime.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${activity.type === 'booking' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.branchName}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* System Alerts */}
      {realTime.systemAlerts && realTime.systemAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>System Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {realTime.systemAlerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-md border-l-4 ${alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    alert.type === 'error' ? 'bg-red-50 border-red-400' :
                      'bg-blue-50 border-blue-400'
                  }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <span className="text-xs text-gray-500">
                      {format(new Date(alert.timestamp), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Report */}
      {filters.reportType === 'attendance' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Attendance Report</span>
            </CardTitle>
            <CardDescription>
              Detailed attendance tracking and patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.attendanceDetails && reports.attendanceDetails.length > 0 ? (
              <div className="space-y-4">
                {reports.attendanceDetails.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{record.studentName}</span>
                        <Badge variant={record.attended ? 'success' : 'destructive'}>
                          {record.attended ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(record.date), 'MMM dd, yyyy')} • {record.teacherName}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.slotTime}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No attendance data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Utilization Report */}
      {filters.reportType === 'utilization' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Slot Utilization</span>
            </CardTitle>
            <CardDescription>
              Slot capacity and booking efficiency analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.utilizationDetails && reports.utilizationDetails.length > 0 ? (
              <div className="space-y-4">
                {reports.utilizationDetails.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{slot.teacherName}</span>
                        <Badge variant={slot.utilizationRate > 80 ? 'success' : slot.utilizationRate > 60 ? 'warning' : 'destructive'}>
                          {Math.round(slot.utilizationRate)}% utilized
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(slot.date), 'MMM dd, yyyy')} • {slot.timeSlot}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {slot.bookedCount}/{slot.capacity} booked
                      </div>
                      <div className="text-xs text-gray-500">
                        {slot.capacity - slot.bookedCount} available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No utilization data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Report */}
      {filters.reportType === 'assessments' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Assessment Analytics</span>
            </CardTitle>
            <CardDescription>
              IELTS score distribution and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.assessmentSummary ? (
              <div className="space-y-6">
                {/* Score Distribution */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Score Distribution</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-md">
                      <div className="text-2xl font-bold text-green-600">
                        {reports.assessmentSummary.averageScore || 0}
                      </div>
                      <div className="text-sm text-green-800">Average Score</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-md">
                      <div className="text-2xl font-bold text-blue-600">
                        {reports.assessmentSummary.totalAssessments || 0}
                      </div>
                      <div className="text-sm text-blue-800">Total Assessments</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-md">
                      <div className="text-2xl font-bold text-yellow-600">
                        {reports.assessmentSummary.highestScore || 0}
                      </div>
                      <div className="text-sm text-yellow-800">Highest Score</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-md">
                      <div className="text-2xl font-bold text-purple-600">
                        {reports.assessmentSummary.improvementRate || 0}%
                      </div>
                      <div className="text-sm text-purple-800">Improvement Rate</div>
                    </div>
                  </div>
                </div>

                {/* Recent Assessments */}
                {reports.recentAssessments && reports.recentAssessments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Assessments</h4>
                    <div className="space-y-3">
                      {reports.recentAssessments.map((assessment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{assessment.studentName}</span>
                              <Badge variant={assessment.score >= 7 ? 'success' : assessment.score >= 5 ? 'warning' : 'destructive'}>
                                {assessment.score}/9
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {assessment.teacherName} • {format(new Date(assessment.assessedAt), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {assessment.remarks && assessment.remarks.length > 50
                              ? `${assessment.remarks.substring(0, 50)}...`
                              : assessment.remarks}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No assessment data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminReports