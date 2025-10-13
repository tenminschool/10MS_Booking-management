import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { assessmentsAPI, bookingsAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useWarningToast } from '@/components/ui/toast'
import {
  GraduationCap,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Award,
  Plus,
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  Users,
  Eye,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import type { Booking } from '@/types'
import { BookingStatus, UserRole } from '@/types'

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
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  } ${className}`}>
    {children}
  </span>
)

const Assessments: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const showWarningToast = useWarningToast()
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isAssessmentInProgress, setIsAssessmentInProgress] = useState<boolean>(false)
  const [timerSeconds, setTimerSeconds] = useState<number>(0)
  const [assessmentStep, setAssessmentStep] = useState<'pre' | 'during' | 'post'>('pre')
  const [assessmentScores, setAssessmentScores] = useState({
    fluency: '',
    lexical: '',
    grammar: '',
    pronunciation: '',
    overall: ''
  })
  const [assessmentRemarks, setAssessmentRemarks] = useState<string>('')
  const [showStartConfirmation, setShowStartConfirmation] = useState<boolean>(false)
  const [showFinishConfirmation, setShowFinishConfirmation] = useState<boolean>(false)
  const [showCompletedDetails, setShowCompletedDetails] = useState<boolean>(false)
  const [selectedCompletedBooking, setSelectedCompletedBooking] = useState<Booking | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Filter states
  const [nameFilter, setNameFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [timeFilter, setTimeFilter] = useState<string>('')
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [scoreFilter, setScoreFilter] = useState<string>('')
  
  // Refs for scrolling to sections
  const pendingSectionRef = useRef<HTMLDivElement>(null)
  const completedSectionRef = useRef<HTMLDivElement>(null)

  const isTeacher = user?.role === UserRole.TEACHER
  const isStudent = user?.role === UserRole.STUDENT
  const isAdmin = user?.role === UserRole.BRANCH_ADMIN || user?.role === UserRole.SUPER_ADMIN

  // Fetch student assessments (for students)
  const { data: studentAssessments, isLoading: studentLoading } = useQuery({
    queryKey: ['student-assessments'],
    queryFn: async () => {
      const response = await assessmentsAPI.getMyAssessments()
      return (response as any).data || []
    },
    enabled: isStudent && !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Fetch teacher's assigned students and bookings (for teachers)
  const { data: teacherBookings, isLoading: teacherLoading } = useQuery({
    queryKey: ['teacher-bookings'],
    queryFn: async () => {
      const response = await bookingsAPI.getTeacherBookings()
      console.log('🔍 Teacher bookings API response:', response);
      
      // Teacher endpoint returns: { data: [...], count: ... }
      const apiResponseData = (response as any).data; // This is the { data: [...], count: ... } object
      const actualBookingsArray = apiResponseData.data; // This is the actual array of bookings
      console.log('🔍 Teacher bookings API response.data:', apiResponseData);
      console.log('🔍 Actual bookings array:', actualBookingsArray);
      return Array.isArray(actualBookingsArray) ? actualBookingsArray : []
    },
    enabled: isTeacher && !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Fetch all assessments (for admins)
  const { data: allAssessments, isLoading: adminLoading } = useQuery({
    queryKey: ['all-assessments'],
    queryFn: async () => {
      const response = await assessmentsAPI.getAll()
      return (response as any).data?.assessments || []
    },
    enabled: isAdmin && !!user,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      const response = await assessmentsAPI.create(assessmentData)
      return (response as any).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['all-assessments'] })
    },
    onError: (error) => {
      console.error('Assessment creation failed:', error)
    }
  })

  // Separate teacher bookings into pending and completed assessments
  // For now, we'll consider CONFIRMED bookings as ready for assessment
  const pendingAssessments = Array.isArray(teacherBookings) 
    ? teacherBookings.filter((booking: any) =>
        (booking.status === BookingStatus.CONFIRMED || booking.status === 'CONFIRMED') && 
        (!booking.assessment || booking.assessment.length === 0)
      )
    : []
  
  const completedAssessments = Array.isArray(teacherBookings)
    ? teacherBookings.filter((booking: any) =>
        (booking.status === BookingStatus.CONFIRMED || booking.status === 'CONFIRMED') && 
        booking.assessment && booking.assessment.length > 0
      )
    : []

  // Filter functions
  const filterAssessments = (assessments: any[]) => {
    return assessments.filter((booking: any) => {
      const matchesName = !nameFilter || 
        (booking.student?.name?.toLowerCase().includes(nameFilter.toLowerCase()) ||
         booking.student?.name?.toLowerCase().includes(nameFilter.toLowerCase()))
      
      const matchesDate = !dateFilter || 
        (booking.slot?.date && format(new Date(booking.slot.date), 'yyyy-MM-dd') === dateFilter)
      
      const matchesTime = !timeFilter || 
        (booking.slot?.startTime && booking.slot.startTime === timeFilter)
      
      const matchesBranch = !branchFilter || 
        (booking.slot?.branch?.name?.toLowerCase().includes(branchFilter.toLowerCase()))
      
      return matchesName && matchesDate && matchesTime && matchesBranch
    })
  }

  const filteredPendingAssessments = filterAssessments(pendingAssessments)
  const filteredCompletedAssessments = filterAssessments(completedAssessments)

  // Scroll functions
  const scrollToPendingAssessments = () => {
    pendingSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

  const scrollToCompletedAssessments = () => {
    completedSectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

  console.log('🔍 Assessment filtering:', {
    teacherBookings: teacherBookings?.length || 0,
    pendingAssessments: pendingAssessments.length,
    completedAssessments: completedAssessments.length,
    sampleBooking: teacherBookings?.[0] ? {
      id: teacherBookings[0].id,
      status: teacherBookings[0].status,
      hasAssessment: teacherBookings[0].assessment && teacherBookings[0].assessment.length > 0
    } : null
  });

  const handleStartAssessment = (booking: any) => {
    setSelectedBooking(booking)
    setShowStartConfirmation(true)
  }

  const confirmStartAssessment = () => {
    setShowStartConfirmation(false)
    setIsAssessmentInProgress(true)
    setAssessmentStep('during')
    setTimerSeconds(0)
    setAssessmentScores({
      fluency: '',
      lexical: '',
      grammar: '',
      pronunciation: '',
      overall: ''
    })
    setAssessmentRemarks('')
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1)
    }, 1000)
  }

  const handleFinishAssessment = () => {
    // Check if all required scores are filled
    const requiredScores = ['fluency', 'lexical', 'grammar', 'pronunciation', 'overall']
    const missingScores = requiredScores.filter(score => !assessmentScores[score as keyof typeof assessmentScores])
    
    if (missingScores.length > 0) {
      alert(`Please fill in all required scores. Missing: ${missingScores.join(', ')}`)
      return
    }
    
    setShowFinishConfirmation(true)
  }

  const confirmFinishAssessment = async () => {
    if (!selectedBooking) return

    try {
      // Save assessment to database
      const assessmentData = {
        bookingId: selectedBooking.id,
        studentId: selectedBooking.student?.id || selectedBooking.studentId,
        teacherId: user?.id,
        fluencyScore: parseFloat(assessmentScores.fluency),
        coherenceScore: parseFloat(assessmentScores.fluency), // Using fluency for coherence too
        lexicalScore: parseFloat(assessmentScores.lexical),
        grammarScore: parseFloat(assessmentScores.grammar),
        pronunciationScore: parseFloat(assessmentScores.pronunciation),
        overallBand: parseFloat(assessmentScores.overall),
        score: parseFloat(assessmentScores.overall),
        remarks: assessmentRemarks,
        assessedAt: new Date().toISOString()
      }

      await createAssessmentMutation.mutateAsync(assessmentData)

      // Clear timer and reset states
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Close finish confirmation popup
      setShowFinishConfirmation(false)
      
      // Move to post-assessment step
      setAssessmentStep('post')
      
      console.log('Assessment completed and saved:', assessmentData)
    } catch (error) {
      console.error('Failed to save assessment:', error)
      alert('Failed to save assessment. Please try again.')
    }
  }

  const handleEndAssessment = () => {
    // Check if assessment was in progress and had partial scores
    if (isAssessmentInProgress && assessmentStep === 'during') {
      const requiredScores = ['fluency', 'lexical', 'grammar', 'pronunciation', 'overall']
      const filledScores = requiredScores.filter(score => assessmentScores[score as keyof typeof assessmentScores])
      
      if (filledScores.length > 0 && filledScores.length < requiredScores.length) {
        showWarningToast(
          'Assessment cancelled with incomplete scores. Please complete all scoring fields before finishing an assessment.',
          'Incomplete Assessment Warning'
        )
      }
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsAssessmentInProgress(false)
    setAssessmentStep('pre')
    setSelectedBooking(null)
    setShowFinishConfirmation(false)
    setShowCompletedDetails(false)
    setSelectedCompletedBooking(null)
    setAssessmentScores({
      fluency: '',
      lexical: '',
      grammar: '',
      pronunciation: '',
      overall: ''
    })
    setAssessmentRemarks('')
  }

  const handleViewCompletedDetails = (booking: any) => {
    setSelectedCompletedBooking(booking)
    setShowCompletedDetails(true)
  }

  const handleScoreChange = (field: string, value: string) => {
    setAssessmentScores(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    if (score >= 5.5) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-red-600 bg-red-50 dark:bg-red-900/20'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7) return 'success'
    if (score >= 5.5) return 'secondary'
    return 'destructive'
  }

  const isLoading = studentLoading || teacherLoading || adminLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Assessments', current: true }
  ]

  // ADMIN VIEW - Show all assessments across the system
  if (isAdmin) {
    const adminAssessments = (allAssessments as any[]) || []
    const averageScore = adminAssessments.length > 0
      ? adminAssessments.reduce((sum: number, assessment: any) => sum + (assessment.overallBand || 0), 0) / adminAssessments.length
      : 0

    return (
      <div className="space-y-6 bg-background dark:bg-gray-900">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor all assessments across the system
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{adminAssessments.length}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{adminAssessments.length > 0 ? averageScore.toFixed(1) : '0.0'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Performers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminAssessments.filter((a: any) => (a.overallBand || 0) >= 7).length}
                  </p>
                </div>
                <Award className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Improvement</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminAssessments.filter((a: any) => (a.overallBand || 0) < 6).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>All Assessments</span>
            </CardTitle>
            <CardDescription>
              Complete list of all assessments in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminAssessments.length > 0 ? (
              <div className="space-y-4">
                {adminAssessments
                  .sort((a: any, b: any) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())
                  .map((assessment: any) => (
                    <div key={assessment.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">
                                {format(new Date(assessment.assessedAt), 'EEEE, MMMM dd, yyyy')}
                              </span>
                            </div>
                            <Badge variant={getScoreBadgeVariant(assessment.overallBand || 0)}>
                              Score: {assessment.overallBand || 0}/9
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>Student: {assessment.student?.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>Teacher: {assessment.teacher?.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{assessment.booking?.slot?.branch?.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4">
                          <div className={`text-2xl font-bold p-3 rounded-lg ${getScoreColor(assessment.overallBand || 0)}`}>
                            {assessment.overallBand || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assessments found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Assessments will appear here as they are completed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // STUDENT VIEW - Show their assessment results
  if (isStudent) {
    const allAssessments = (studentAssessments as any[]) || []
    
    // Apply filters
    const assessments = allAssessments.filter((assessment: any) => {
      // Date filter
      if (dateFilter === 'latest') {
        // Already sorted by latest first in the display
      } else if (dateFilter === 'oldest') {
        // Will be sorted by oldest first in the display
      } else if (dateFilter === 'this-week') {
        const assessmentDate = new Date(assessment.assessedAt)
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (assessmentDate < weekAgo) return false
      } else if (dateFilter === 'this-month') {
        const assessmentDate = new Date(assessment.assessedAt)
        const now = new Date()
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (assessmentDate < monthAgo) return false
      } else if (dateFilter === 'last-month') {
        const assessmentDate = new Date(assessment.assessedAt)
        const now = new Date()
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        if (assessmentDate < twoMonthsAgo || assessmentDate > monthAgo) return false
      }
      
      // Branch filter
      if (branchFilter && !assessment.booking?.slot?.branch?.name?.toLowerCase().includes(branchFilter.toLowerCase())) {
        return false
      }
      
      // Score filter
      if (scoreFilter === 'high' && (assessment.overallBand || 0) < 7) {
        return false
      } else if (scoreFilter === 'medium' && ((assessment.overallBand || 0) < 5 || (assessment.overallBand || 0) >= 7)) {
        return false
      } else if (scoreFilter === 'low' && (assessment.overallBand || 0) >= 5) {
        return false
      }
      
      return true
    })
    
    // Sort assessments based on date filter
    const sortedAssessments = [...assessments]
    if (dateFilter === 'oldest') {
      sortedAssessments.sort((a: any, b: any) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime())
    } else {
      // Default: latest first
      sortedAssessments.sort((a: any, b: any) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())
    }
    
    const averageScore = sortedAssessments.length > 0
      ? sortedAssessments.reduce((sum: number, assessment: any) => sum + (assessment.overallBand || 0), 0) / sortedAssessments.length
      : 0
    const highestScore = sortedAssessments.length > 0
      ? Math.max(...sortedAssessments.map((a: any) => a.overallBand || 0))
      : 0
    const latestScore = sortedAssessments.length > 0
      ? sortedAssessments[0].overallBand || 0
      : 0

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Assessments</h1>
          <p className="text-gray-600 dark:text-gray-400">
              Track your IELTS speaking test scores and progress
          </p>
        </div>
          <Link to="/schedule">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Book New Test
            </Button>
          </Link>
      </div>

      {/* Filters for Students */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
              <div className="p-1.5 bg-blue-100 dark:bg-gray-600 rounded-lg">
                <Filter className="w-4 h-4 text-blue-600 dark:text-gray-300" />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filters</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 overflow-x-auto">
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
              >
                <option value="">All Dates</option>
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
              </select>

              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
              >
                <option value="">All Branches</option>
                <option value="Dhanmondi">Dhanmondi Branch</option>
                <option value="Gulshan">Gulshan Branch</option>
                <option value="Uttara">Uttara Branch</option>
              </select>

              {/* Score Range Filter */}
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:min-w-[140px] flex-shrink-0"
              >
                <option value="">All Scores</option>
                <option value="high">High (7-9)</option>
                <option value="medium">Medium (5-6.9)</option>
                <option value="low">Low (0-4.9)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5" />
                <span>Assessment History</span>
              </CardTitle>
              <CardDescription>
                Your IELTS speaking test scores and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
                {sortedAssessments.length > 0 ? (
                <div className="space-y-4">
                    {sortedAssessments.map((assessment: any) => (
                      <div key={assessment.id} className="p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="font-medium text-sm sm:text-base truncate">
                                  {format(new Date(assessment.assessedAt), 'EEEE, MMMM dd, yyyy')}
                                </span>
                              </div>
                              <Badge variant={getScoreBadgeVariant(assessment.overallBand)} className="w-fit">
                                Score: {assessment.overallBand}/9
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{assessment.teacher?.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{assessment.booking?.slot?.branch?.name}</span>
                              </div>
                            </div>

                            {assessment.remarks && (
                              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 break-words">
                                  <strong>Teacher's feedback:</strong> {assessment.remarks}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 self-center sm:self-start">
                            <div className={`text-xl sm:text-2xl font-bold p-2 sm:p-3 rounded-lg text-center min-w-[60px] ${getScoreColor(assessment.overallBand)}`}>
                              {assessment.overallBand}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No assessments yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Complete your first speaking test to see your scores here
                  </p>
                  <Link to="/schedule">
                    <Button>Book Your First Test</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECONDARY CONTENT - 1/3 width */}
        <div className="space-y-6">
          {/* Score Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Score Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{averageScore.toFixed(1)}</div>
                    <p className="text-xs text-gray-500">Average Score</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{highestScore}</div>
                    <p className="text-xs text-gray-500">Highest Score</p>
                </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{latestScore}</div>
                    <p className="text-xs text-gray-500">Latest Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

            {/* Progress Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Progress Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Progress chart will be implemented</p>
                    </div>
              </CardContent>
            </Card>
                  </div>
                    </div>
      </div>
    )
  }

  // TEACHER VIEW - Show assigned students and assessment tools
  if (isTeacher) {
    return (
      <div className="space-y-6 bg-background dark:bg-gray-900">
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment Center</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage student assessments and view results
            </p>
                  </div>
                </div>

        {/* Assessment Statistics - Two separate clickable cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] rounded-lg shadow-sm border"
            onClick={scrollToPendingAssessments}
          >
            <CardHeader>
              <CardTitle className="text-orange-900 dark:text-orange-300 flex items-center justify-between">
                <span>Pending Assessments</span>
                <span className="text-sm font-normal opacity-75">Click to view →</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-900 dark:text-orange-300">{pendingAssessments.length}</div>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-2">Awaiting Assessment</p>
              </div>
            </CardContent>
          </div>
          
          <div 
            className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] rounded-lg shadow-sm border"
            onClick={scrollToCompletedAssessments}
          >
            <CardHeader>
              <CardTitle className="text-green-900 dark:text-green-300 flex items-center justify-between">
                <span>Completed Assessments</span>
                <span className="text-sm font-normal opacity-75">Click to view →</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-900 dark:text-green-300">{completedAssessments.length}</div>
                <p className="text-sm text-green-700 dark:text-green-400 mt-2">Successfully Completed</p>
              </div>
            </CardContent>
          </div>
        </div>

        {/* Assessment Guidelines - Full width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Assessment Guidelines</span>
            </CardTitle>
            <CardDescription>
              Pre-assessment guidelines for IELTS speaking tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Fluency & Coherence</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Assess how well the student speaks smoothly and connects ideas clearly.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Lexical Resource</h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Evaluate vocabulary range, accuracy, and appropriateness of word choice.
                    </p>
                  </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Grammar & Accuracy</h4>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  Check grammatical accuracy and range of sentence structures used.
                </p>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Assessment Filters - Full width */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Student Name</label>
                <input
                  type="text"
                  placeholder="Search by name"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All times</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="11:00">11:00</option>
                  <option value="12:00">12:00</option>
                  <option value="13:00">13:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Branch</label>
                <input
                  type="text"
                  placeholder="Search by branch"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Full width */}
        <div className="space-y-6">
            {/* Pending Assessments */}
            <div ref={pendingSectionRef}>
            {filteredPendingAssessments.length > 0 && (
            <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">Pending Assessments</span>
                    <Badge variant="destructive">{filteredPendingAssessments.length}</Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Completed sessions that need assessment scores
                  </CardDescription>
              </CardHeader>
              <CardContent>
                    <div className="space-y-2">
                      {filteredPendingAssessments.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd, yyyy')}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {booking.slot?.startTime} - {booking.slot?.endTime}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <User className="w-4 h-4" />
                                <span>{booking.student?.name}</span>
                        </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-4 h-4" />
                                <span>{booking.slot?.branch?.name}</span>
                      </div>
                  </div>
                </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="destructive" className="text-xs px-2 py-1">
                              Pending
                            </Badge>
                          <Button
                            onClick={() => handleStartAssessment(booking)}
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white"
                          >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
            </div>

            {/* Completed Assessments */}
            <div ref={completedSectionRef}>
          <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Completed Assessments</span>
                  </div>
                </div>
                <CardDescription>
                  Recently completed assessments
                </CardDescription>
            </CardHeader>
            <CardContent>
                {filteredCompletedAssessments.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCompletedAssessments
                        .sort((a: any, b: any) => new Date(b.assessment?.[0]?.assessedAt).getTime() - new Date(a.assessment?.[0]?.assessedAt).getTime())
                        .slice(0, 5)
                        .map((booking: any) => (
                          <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-4">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {booking.slot?.date && format(new Date(booking.slot.date), 'MMM dd, yyyy')}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {booking.slot?.startTime} - {booking.slot?.endTime}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                  <User className="w-4 h-4" />
                                  <span>{booking.student?.name}</span>
                </div>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    <span>{booking.slot?.branch?.name}</span>
                </div>
                </div>
                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-center">
                                <div className={`text-2xl font-bold ${getScoreColor(booking.assessment?.[0]?.score || booking.assessment?.[0]?.overallBand)}`}>
                                {booking.assessment?.[0]?.score || booking.assessment?.[0]?.overallBand}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">out of 9</p>
              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewCompletedDetails(booking)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {filteredCompletedAssessments.length === 0 && completedAssessments.length > 0 
                        ? 'No assessments match your current filters' 
                        : 'No completed assessments yet'}
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
              </div>
        </div>

        {/* Assessment Workflow Overlay */}
        {isAssessmentInProgress && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              
              {/* Step 1: Pre-Assessment */}
              {assessmentStep === 'pre' && (
                <div className="text-center">
                  <h3 className="text-2xl font-semibold mb-4">Assessment Guidelines</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    You are about to assess: <strong>{selectedBooking?.student?.name}</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Fluency & Coherence (25%)</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Assess smoothness of speech, logical flow, and ability to develop ideas clearly.
                      </p>
                </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-left">
                      <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Lexical Resource (25%)</h4>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Evaluate vocabulary range, accuracy, and appropriateness of word choice.
                      </p>
                </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-left">
                      <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Grammar & Accuracy (25%)</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        Check grammatical accuracy and range of sentence structures used.
                      </p>
              </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-left">
                      <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-2">Pronunciation (25%)</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-400">
                        Assess clarity, stress, rhythm, and intonation patterns.
                      </p>
                </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleEndAssessment}>
                      Cancel
                    </Button>
                    <Button onClick={confirmStartAssessment} className="bg-red-500 hover:bg-red-600">
                      <Play className="w-4 h-4 mr-2" />
                      Start Assessment
                    </Button>
                </div>
                </div>
              )}

              {/* Step 2: During Assessment */}
              {assessmentStep === 'during' && (
                  <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold">Assessment in Progress</h3>
                    <div className="text-2xl font-bold text-red-600">
                      {formatTime(timerSeconds)}
                  </div>
                </div>

                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium mb-2">Student: {selectedBooking?.student?.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Date: {selectedBooking?.slot?.date && format(new Date(selectedBooking.slot.date), 'MMMM dd, yyyy')} | 
                      Time: {selectedBooking?.slot?.startTime} - {selectedBooking?.slot?.endTime}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Fluency & Coherence (1-9)</label>
                      <select 
                        value={assessmentScores.fluency}
                        onChange={(e) => handleScoreChange('fluency', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select score</option>
                        {[1,2,3,4,5,6,7,8,9].map(score => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Lexical Resource (1-9)</label>
                      <select 
                        value={assessmentScores.lexical}
                        onChange={(e) => handleScoreChange('lexical', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select score</option>
                        {[1,2,3,4,5,6,7,8,9].map(score => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                  </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Grammar & Accuracy (1-9)</label>
                      <select 
                        value={assessmentScores.grammar}
                        onChange={(e) => handleScoreChange('grammar', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select score</option>
                        {[1,2,3,4,5,6,7,8,9].map(score => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                </div>
                    
                  <div>
                      <label className="block text-sm font-medium mb-2">Pronunciation (1-9)</label>
                      <select 
                        value={assessmentScores.pronunciation}
                        onChange={(e) => handleScoreChange('pronunciation', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select score</option>
                        {[1,2,3,4,5,6,7,8,9].map(score => (
                          <option key={score} value={score}>{score}</option>
                        ))}
                      </select>
                  </div>
                </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Overall Band Score (1-9)</label>
                    <select 
                      value={assessmentScores.overall}
                      onChange={(e) => handleScoreChange('overall', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select overall score</option>
                      {[1,2,3,4,5,5.5,6,6.5,7,7.5,8,8.5,9].map(score => (
                        <option key={score} value={score}>{score}</option>
                      ))}
                    </select>
              </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Remarks & Notes</label>
                    <textarea 
                      value={assessmentRemarks}
                      onChange={(e) => setAssessmentRemarks(e.target.value)}
                      placeholder="Add detailed feedback, notes, and observations about the student's performance..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleEndAssessment}>
                      Cancel Assessment
                    </Button>
                    <Button 
                      onClick={handleFinishAssessment}
                      className="bg-red-500 hover:bg-red-600"
                      disabled={!assessmentScores.fluency || !assessmentScores.lexical || !assessmentScores.grammar || !assessmentScores.pronunciation || !assessmentScores.overall}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finish Assessment
                </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Post-Assessment */}
              {assessmentStep === 'post' && (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-4">Assessment Completed</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Assessment for <strong>{selectedBooking?.student?.name}</strong> has been completed successfully.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                    <h4 className="font-medium mb-4">Assessment Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Fluency & Coherence</p>
                        <p className="font-semibold text-lg">{assessmentScores.fluency}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Lexical Resource</p>
                        <p className="font-semibold text-lg">{assessmentScores.lexical}</p>
                    </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Grammar & Accuracy</p>
                        <p className="font-semibold text-lg">{assessmentScores.grammar}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Pronunciation</p>
                        <p className="font-semibold text-lg">{assessmentScores.pronunciation}</p>
                    </div>
                      </div>
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                      <p className="text-gray-600 dark:text-gray-400">Overall Band Score</p>
                      <p className="font-bold text-3xl text-red-600">{assessmentScores.overall}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-gray-600 dark:text-gray-400">Assessment Duration</p>
                      <p className="font-semibold">{formatTime(timerSeconds)}</p>
                      </div>
                    </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleEndAssessment}>
                  Close
                </Button>
                    <Button onClick={handleEndAssessment} className="bg-red-500 hover:bg-red-600">
                      Start New Assessment
                </Button>
              </div>
            </div>
          )}
            </div>
          </div>
        )}

        {/* Start Assessment Confirmation Dialog with Guidelines */}
        {showStartConfirmation && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-semibold mb-6 text-center">Start Assessment</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                Are you ready to start the assessment for <strong>{selectedBooking?.student?.name}</strong>?
              </p>
              
              {/* Assessment Guidelines */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Assessment Guidelines & Scoring Rubrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Fluency & Coherence (25%)</h5>
                    <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                      <p><strong>9:</strong> Speaks fluently with only rare repetition or self-correction</p>
                      <p><strong>7-8:</strong> Speaks at length with minimal hesitation</p>
                      <p><strong>5-6:</strong> Usually maintains flow but may use repetition</p>
                      <p><strong>3-4:</strong> Cannot respond without noticeable pauses</p>
                      <p><strong>1-2:</strong> Pauses lengthily before most words</p>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2">Lexical Resource (25%)</h5>
                    <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                      <p><strong>9:</strong> Uses vocabulary with full flexibility and precision</p>
                      <p><strong>7-8:</strong> Uses vocabulary resource flexibly</p>
                      <p><strong>5-6:</strong> Has adequate vocabulary for topics</p>
                      <p><strong>3-4:</strong> Limited vocabulary causing hesitation</p>
                      <p><strong>1-2:</strong> Very limited vocabulary</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                    <h5 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Grammar & Accuracy (25%)</h5>
                    <div className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
                      <p><strong>9:</strong> Uses a full range of structures naturally</p>
                      <p><strong>7-8:</strong> Uses a range of structures with flexibility</p>
                      <p><strong>5-6:</strong> Uses mix of simple and complex forms</p>
                      <p><strong>3-4:</strong> Uses only basic sentence forms</p>
                      <p><strong>1-2:</strong> Attempts basic forms but with limited success</p>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <h5 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">Pronunciation (25%)</h5>
                    <div className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                      <p><strong>9:</strong> Easy to understand throughout</p>
                      <p><strong>7-8:</strong> Easy to understand with occasional lapses</p>
                      <p><strong>5-6:</strong> Generally clear despite some mispronunciation</p>
                      <p><strong>3-4:</strong> Mispronunciations cause some difficulty</p>
                      <p><strong>1-2:</strong> Very difficult to understand</p>
                    </div>
                  </div>
                </div>
                
                {/* Overall Scoring Guidelines */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Overall Band Score Guidelines</h5>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <p><strong>9:</strong> Expert user - Has fully operational command of the language</p>
                    <p><strong>7-8:</strong> Good user - Has operational command with occasional inaccuracies</p>
                    <p><strong>5-6:</strong> Modest user - Has partial command of the language</p>
                    <p><strong>3-4:</strong> Limited user - Basic competence is limited to familiar situations</p>
                    <p><strong>1-2:</strong> Extremely limited user - Conveys and understands only general meaning</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 justify-center">
                <Button variant="outline" onClick={() => setShowStartConfirmation(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmStartAssessment} className="bg-red-500 hover:bg-red-600">
                  Start Assessment
                </Button>
                      </div>
                    </div>
                  </div>
        )}

        {/* Finish Assessment Confirmation Dialog */}
        {showFinishConfirmation && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Finish Assessment</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to finish this assessment? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowFinishConfirmation(false)}>
                  Continue Assessment
                </Button>
                <Button onClick={confirmFinishAssessment} className="bg-red-500 hover:bg-red-600">
                  Finish Assessment
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Completed Assessment Details Modal */}
        {showCompletedDetails && selectedCompletedBooking && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold">Assessment Details</h3>
                <Button variant="outline" onClick={() => setShowCompletedDetails(false)}>
                  Close
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Student Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium mb-2">Student Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="ml-2 font-medium">{selectedCompletedBooking.student?.name}</span>
                      </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Session Date:</span>
                      <span className="ml-2 font-medium">
                        {selectedCompletedBooking.slot?.date && format(new Date(selectedCompletedBooking.slot.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Session Time:</span>
                      <span className="ml-2 font-medium">
                        {selectedCompletedBooking.slot?.startTime} - {selectedCompletedBooking.slot?.endTime}
                        </span>
                      </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Branch:</span>
                      <span className="ml-2 font-medium">{selectedCompletedBooking.slot?.branch?.name}</span>
                    </div>
                      </div>
                    </div>

                {/* Assessment Scores */}
                {(selectedCompletedBooking as any).assessment?.[0] && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium mb-4">Assessment Scores</h4>
                    <div className="flex flex-wrap gap-4 justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Fluency & Coherence</p>
                        <p className="text-xl font-bold text-blue-600">{(selectedCompletedBooking as any).assessment[0].fluencyScore || 'N/A'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Lexical Resource</p>
                        <p className="text-xl font-bold text-green-600">{(selectedCompletedBooking as any).assessment[0].lexicalScore || 'N/A'}</p>
                    </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Grammar & Accuracy</p>
                        <p className="text-xl font-bold text-purple-600">{(selectedCompletedBooking as any).assessment[0].grammarScore || 'N/A'}</p>
                  </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Pronunciation</p>
                        <p className="text-xl font-bold text-orange-600">{(selectedCompletedBooking as any).assessment[0].pronunciationScore || 'N/A'}</p>
                </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Overall Band Score</p>
                      <p className="text-4xl font-bold text-red-600">{(selectedCompletedBooking as any).assessment[0].overallBand || (selectedCompletedBooking as any).assessment[0].score || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Assessment Details */}
                {(selectedCompletedBooking as any).assessment?.[0] && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium mb-4">Assessment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Assessed At:</span>
                        <span className="ml-2 font-medium">
                          {(selectedCompletedBooking as any).assessment[0].assessedAt && format(new Date((selectedCompletedBooking as any).assessment[0].assessedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="ml-2 font-medium">
                          <Badge variant="success">Completed</Badge>
                        </span>
                    </div>
                  </div>
                  </div>
                )}

                {/* Teacher Remarks */}
                {(selectedCompletedBooking as any).assessment?.[0]?.remarks && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium mb-2">Teacher Remarks</h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {(selectedCompletedBooking as any).assessment[0].remarks}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Close teacher main wrapper */}
      </div>
    )
  }

  return null
}

export default Assessments