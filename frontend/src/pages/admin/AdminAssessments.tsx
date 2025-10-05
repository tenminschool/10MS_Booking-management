import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { assessmentsAPI, bookingsAPI, branchesAPI } from '@/lib/api'
import { UserRole, type Assessment, type Booking } from '@/types'
import { format, isValid, parseISO } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'

// Safe date formatting function - moved outside component to be accessible by child components
const safeFormatDate = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return 'N/A'
  
  try {
    // Try to parse the date string
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
    
    // Check if the date is valid
    if (!isValid(date)) {
      return 'Invalid Date'
    }
    
    return format(date, formatString)
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', dateString)
    return 'Invalid Date'
  }
}
import { 
  ClipboardList, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  Shield,
  AlertCircle,
  Star,
  Calendar,
  Building,
  GraduationCap,
  BookOpen
} from 'lucide-react'

// Mock UI components - replace with actual shadcn/ui components when available
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm ${className}`}>{children}</div>
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
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-orange-500 text-white hover:bg-orange-600' :
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
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
    variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  }`}>
    {children}
  </span>
)

const AdminAssessments: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'completed' | 'pending' | 'draft' | ''>('')
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [scoreFilter, setScoreFilter] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [page, setPage] = useState(1)
  const limit = 20

  // Only super admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Only Super Admins can manage assessments across all branches.</p>
        </div>
      </div>
    )
  }

  // Fetch assessments based on filters
  const { data: assessmentsData, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['admin-assessments', {
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      branchId: branchFilter || undefined,
      score: scoreFilter || undefined,
      page,
      limit
    }],
        queryFn: async () => {
          const response = await assessmentsAPI.getAll({
            search: searchTerm || undefined,
            status: statusFilter || undefined,
            branchId: branchFilter || undefined,
            score: scoreFilter || undefined,
            page,
            limit
          })
          return (response as any).data
        },
  })

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
        queryFn: async () => {
          const response = await branchesAPI.getAll()
          return (response as any).data
        },
  })

  // Fetch bookings for assessment creation
  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-for-assessment'],
        queryFn: async () => {
          const response = await bookingsAPI.getAll({ status: 'confirmed' })
          return (response as any).data
        },
  })

  const assessments = assessmentsData?.assessments || []
  const pagination = assessmentsData?.pagination
  const branches = branchesData?.branches || []
  const bookings = bookingsData?.bookings || []

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await assessmentsAPI.create(data)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assessments'] })
      setShowCreateForm(false)
      successToast('Assessment created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create assessment')
    }
  })

  // Update assessment mutation
  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await assessmentsAPI.update(id, data)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assessments'] })
      setEditingAssessment(null)
      successToast('Assessment updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update assessment')
    }
  })

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await assessmentsAPI.delete(id)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assessments'] })
      successToast('Assessment deleted successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to delete assessment')
    }
  })

  const handleCreateAssessment = (assessmentData: any) => {
    createAssessmentMutation.mutate(assessmentData)
  }

  const handleUpdateAssessment = (assessmentData: any) => {
    if (editingAssessment) {
      updateAssessmentMutation.mutate({
        id: editingAssessment.id,
        data: assessmentData
      })
    }
  }

  const handleDeleteAssessment = (assessmentId: string) => {
    if (confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      deleteAssessmentMutation.mutate(assessmentId)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'draft':
        return <BookOpen className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'draft':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7) return 'success'
    if (score >= 6) return 'warning'
    return 'destructive'
  }

  const getAssessmentStats = () => {
    const total = assessments.length
    const completed = assessments.filter((a: any) => a.status === 'completed').length
    const pending = assessments.filter((a: any) => a.status === 'pending').length
    const draft = assessments.filter((a: any) => a.status === 'draft').length
    const averageScore = assessments.length > 0
      ? (assessments.reduce((sum: number, a: any) => sum + (a.overallScore || 0), 0) / assessments.length).toFixed(1)
      : 0

    return { total, completed, pending, draft, averageScore }
  }

  const stats = getAssessmentStats()

  if (assessmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'Assessment Management', current: true }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assessment Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all assessments across all branches with complete control and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            size="sm"
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <ClipboardList className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Assessments</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <BookOpen className="w-6 h-6 text-purple-500" />
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
              <Star className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageScore}</p>
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
                  placeholder="Search assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches && branches.length > 0 ? branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                )) : (
                  <option value="" disabled>Loading branches...</option>
                )}
              </select>

              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Scores</option>
                <option value="7-9">High (7-9)</option>
                <option value="6-6.9">Medium (6-6.9)</option>
                <option value="0-5.9">Low (0-5.9)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessments Grid/Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments && assessments.length > 0 ? assessments.map((assessment: any) => (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {assessment.student?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <CardTitle className="text-base">{assessment.student?.name || 'Unknown Student'}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusIcon(assessment.status)}
                        <Badge variant={getStatusBadgeVariant(assessment.status)}>
                          {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAssessment(assessment)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAssessment(assessment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{safeFormatDate(assessment.booking?.slot?.startTime, 'MMM dd, yyyy')}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <GraduationCap className="w-4 h-4" />
                    <span>{assessment.teacher?.name || 'No Teacher'}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Building className="w-4 h-4" />
                    <span>{assessment.booking?.slot?.branch?.name || 'No Branch'}</span>
                  </div>

                  {assessment.overallScore && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg font-bold ${getScoreColor(assessment.overallScore)}`}>
                          {assessment.overallScore.toFixed(1)}
                        </span>
                        <Badge variant={getScoreBadgeVariant(assessment.overallScore)}>
                          {assessment.overallScore >= 7 ? 'Excellent' : 
                           assessment.overallScore >= 6 ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {assessment.remarks && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Remarks:</strong> {assessment.remarks.substring(0, 100)}
                      {assessment.remarks.length > 100 && '...'}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {assessment.id.slice(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {safeFormatDate(assessment.createdAt, 'MMM dd')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : null}

          {assessments.length === 0 && (
            <div className="col-span-full">
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No assessments found</p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Create First Assessment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="w-5 h-5" />
              <span>Assessments Table</span>
            </CardTitle>
            <CardDescription>
              Detailed view of all assessments with their scores and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Teacher</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Branch</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments && assessments.length > 0 ? assessments.map((assessment: any) => (
                    <tr key={assessment.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {assessment.student?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{assessment.student?.name || 'Unknown Student'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {assessment.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {safeFormatDate(assessment.booking?.slot?.startTime, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {safeFormatDate(assessment.booking?.slot?.startTime, 'h:mm a')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {assessment.teacher?.name || 'No Teacher'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {assessment.booking?.slot?.branch?.name || 'No Branch'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {assessment.overallScore ? (
                          <div className="flex items-center space-x-2">
                            <span className={`text-lg font-bold ${getScoreColor(assessment.overallScore)}`}>
                              {assessment.overallScore.toFixed(1)}
                            </span>
                            <Badge variant={getScoreBadgeVariant(assessment.overallScore)}>
                              {assessment.overallScore >= 7 ? 'Excellent' : 
                               assessment.overallScore >= 6 ? 'Good' : 'Needs Improvement'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Not scored</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(assessment.status)}
                          <Badge variant={getStatusBadgeVariant(assessment.status)}>
                            {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAssessment(assessment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAssessment(assessment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center space-y-4">
                          <ClipboardList className="w-16 h-16 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400">No assessments found</p>
                          <Button onClick={() => setShowCreateForm(true)}>
                            Create First Assessment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} assessments
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Assessment Modal */}
      {(showCreateForm || editingAssessment) && (
        <AssessmentFormModal
          assessment={editingAssessment}
          bookings={bookings}
          onSubmit={editingAssessment ? handleUpdateAssessment : handleCreateAssessment}
          onClose={() => {
            setShowCreateForm(false)
            setEditingAssessment(null)
          }}
          isLoading={createAssessmentMutation.isPending || updateAssessmentMutation.isPending}
        />
      )}
    </div>
  )
}

// Assessment Form Modal Component
interface AssessmentFormModalProps {
  assessment?: Assessment | null
  bookings: Booking[]
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const AssessmentFormModal: React.FC<AssessmentFormModalProps> = ({
  assessment,
  bookings,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    bookingId: assessment?.bookingId || '',
    fluencyScore: assessment?.fluencyScore || 0,
    coherenceScore: assessment?.coherenceScore || 0,
    lexicalResourceScore: assessment?.lexicalResourceScore || 0,
    grammaticalRangeScore: assessment?.grammaticalRangeScore || 0,
    pronunciationScore: assessment?.pronunciationScore || 0,
    overallScore: assessment?.overallScore || 0,
    remarks: assessment?.remarks || '',
    status: assessment?.status || 'draft'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const selectedBooking = bookings.find(booking => booking.id === formData.bookingId)

  const calculateOverallScore = () => {
    const scores = [
      formData.fluencyScore,
      formData.coherenceScore,
      formData.lexicalResourceScore,
      formData.grammaticalRangeScore,
      formData.pronunciationScore
    ]
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    setFormData({ ...formData, overallScore: Math.round(average * 10) / 10 })
  }

  React.useEffect(() => {
    calculateOverallScore()
  }, [formData.fluencyScore, formData.coherenceScore, formData.lexicalResourceScore, formData.grammaticalRangeScore, formData.pronunciationScore])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {assessment ? 'Edit Assessment' : 'Create New Assessment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Booking *
            </label>
            <select
              value={formData.bookingId}
              onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Select Booking</option>
              {bookings && bookings.length > 0 ? bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.student?.name} - {safeFormatDate(booking.slot?.startTime, 'MMM dd, yyyy h:mm a')} ({booking.slot?.teacher?.name})
                </option>
              )) : (
                <option value="" disabled>No bookings available</option>
              )}
            </select>
          </div>

          {selectedBooking && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Selected Booking Details:</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>Student: {selectedBooking.student?.name}</div>
                <div>Date: {safeFormatDate(selectedBooking.slot?.startTime, 'MMM dd, yyyy')}</div>
                <div>Time: {safeFormatDate(selectedBooking.slot?.startTime, 'h:mm a')} - {safeFormatDate(selectedBooking.slot?.endTime, 'h:mm a')}</div>
                <div>Teacher: {selectedBooking.slot?.teacher?.name}</div>
                <div>Branch: {selectedBooking.slot?.branch?.name}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fluency Score (0-9) *
              </label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={formData.fluencyScore}
                onChange={(e) => setFormData({ ...formData, fluencyScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Coherence Score (0-9) *
              </label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={formData.coherenceScore}
                onChange={(e) => setFormData({ ...formData, coherenceScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lexical Resource Score (0-9) *
              </label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={formData.lexicalResourceScore}
                onChange={(e) => setFormData({ ...formData, lexicalResourceScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grammatical Range Score (0-9) *
              </label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={formData.grammaticalRangeScore}
                onChange={(e) => setFormData({ ...formData, grammaticalRangeScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pronunciation Score (0-9) *
              </label>
              <input
                type="number"
                min="0"
                max="9"
                step="0.5"
                value={formData.pronunciationScore}
                onChange={(e) => setFormData({ ...formData, pronunciationScore: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Overall Score (Auto-calculated)
              </label>
              <input
                type="number"
                value={formData.overallScore}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'pending' | 'completed' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
              placeholder="Detailed feedback and remarks for the student..."
            />
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
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? 'Saving...' : (assessment ? 'Update Assessment' : 'Create Assessment')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminAssessments
