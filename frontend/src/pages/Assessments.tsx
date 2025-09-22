import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { assessmentsAPI, dashboardAPI, bookingsAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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
const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => (
  open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  ) : null
)
const DialogContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)
const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
)
const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
)
const DialogDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)
import {
  GraduationCap,
  Calendar,
  User,
  MapPin,
  TrendingUp,
  Award,
  BookOpen,
  Download,
  Plus,
  Eye,
  FileText,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'
import type { Assessment, Booking, AssessmentRequest } from '@/types'
import { BookingStatus, UserRole } from '@/types'

const Assessments: React.FC = () => {
  const { user } = useAuth()
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [assessmentForm, setAssessmentForm] = useState({
    score: 0,
    remarks: ''
  })

  const queryClient = useQueryClient()

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentRequest) => {
      const response = await assessmentsAPI.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      queryClient.invalidateQueries({ queryKey: ['completed-bookings'] })
      setIsRecordingDialogOpen(false)
      setAssessmentForm({ score: 0, remarks: '' })
      setSelectedBooking(null)
    },
  })

  const isTeacher = user?.role === UserRole.TEACHER

  // Fetch assessments
  const { data: assessments, isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const response = await assessmentsAPI.getMyAssessments()
      return response.data
    },
  })

  // Fetch dashboard data for stats (unused but kept for consistency)
  const { } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await dashboardAPI.getMetrics()
      return response.data
    },
  })

  // Fetch completed bookings for teachers to record assessments
  const { data: completedBookings } = useQuery({
    queryKey: ['completed-bookings'],
    queryFn: async () => {
      const response = await bookingsAPI.getMyBookings()
      return response.data?.filter((booking: Booking) =>
        booking.status === BookingStatus.COMPLETED &&
        !(booking as any).assessments?.length
      ) || []
    },
    enabled: isTeacher,
  })

  const handleViewDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setIsDetailDialogOpen(true)
  }

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-50'
    if (score >= 5.5) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7) return 'default'
    if (score >= 5.5) return 'secondary'
    return 'destructive'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const allAssessments = (assessments as Assessment[]) || []
  const averageScore = allAssessments.length > 0
    ? allAssessments.reduce((sum: number, assessment: Assessment) => sum + assessment.score, 0) / allAssessments.length
    : 0
  const highestScore = allAssessments.length > 0
    ? Math.max(...allAssessments.map((a: Assessment) => a.score))
    : 0
  const latestScore = allAssessments.length > 0
    ? allAssessments.sort((a: Assessment, b: Assessment) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())[0].score
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isTeacher ? 'Assessment Recording' : 'My Assessments'}
          </h1>
          <p className="text-gray-600">
            {isTeacher
              ? 'Record IELTS scores and feedback for completed sessions'
              : 'Track your IELTS speaking test scores and progress'}
          </p>
        </div>

        {!isTeacher && (
          <Link to="/schedule">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Book New Test
            </Button>
          </Link>
        )}
      </div>

      {/* Two-Column Layout: 2/3 Primary + 1/3 Secondary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PRIMARY CONTENT - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teacher: Pending Assessments */}
          {isTeacher && completedBookings && (completedBookings as Booking[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Pending Assessments</span>
                </CardTitle>
                <CardDescription>
                  Completed sessions that need assessment scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(completedBookings as Booking[]).map((booking: Booking) => (
                    <div key={booking.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">
                                {booking.slot?.date && format(new Date(booking.slot.date), 'EEEE, MMMM dd, yyyy')}
                              </span>
                            </div>
                            <Badge variant="secondary">
                              Needs Assessment
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{booking.slot?.startTime} - {booking.slot?.endTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{booking.student?.name}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            setSelectedBooking(booking)
                            setIsRecordingDialogOpen(true)
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Record Score
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
              {allAssessments.length > 0 ? (
                <div className="space-y-4">
                  {allAssessments
                    .sort((a: Assessment, b: Assessment) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime())
                    .map((assessment: Assessment) => (
                      <div key={assessment.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">
                                  {format(new Date(assessment.assessedAt), 'EEEE, MMMM dd, yyyy')}
                                </span>
                              </div>
                              <Badge variant={getScoreBadgeVariant(assessment.score)}>
                                Score: {assessment.score}/9
                              </Badge>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>{assessment.teacher?.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{assessment.booking?.slot?.branch?.name}</span>
                              </div>
                            </div>

                            {assessment.remarks && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  <strong>Teacher's feedback:</strong> {assessment.remarks}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <div className={`text-2xl font-bold p-3 rounded-lg ${getScoreColor(assessment.score)}`}>
                              {assessment.score}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(assessment)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
                  <p className="text-gray-500 mb-4">
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
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {averageScore > 0 ? averageScore.toFixed(1) : '0.0'}
                  </div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {highestScore > 0 ? highestScore.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-xs text-gray-600">Highest</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {latestScore > 0 ? latestScore.toFixed(1) : '0.0'}
                    </div>
                    <div className="text-xs text-gray-600">Latest</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Tests</span>
                  <span className="font-medium">{allAssessments.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Insights */}
          {allAssessments.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const sortedAssessments = allAssessments.sort((a: Assessment, b: Assessment) =>
                      new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
                    )
                    const firstScore = sortedAssessments[0].score
                    const lastScore = sortedAssessments[sortedAssessments.length - 1].score
                    const improvement = lastScore - firstScore

                    return (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${improvement > 0 ? 'text-green-600' :
                            improvement < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {improvement > 0 ? 'Improvement' :
                            improvement < 0 ? 'Decline' : 'No Change'}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* IELTS Score Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span className="text-sm">IELTS Score Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>9.0</span>
                  <span className="text-green-600 font-medium">Expert</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>8.0-8.5</span>
                  <span className="text-green-600">Very Good</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>7.0-7.5</span>
                  <span className="text-blue-600">Good</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>6.0-6.5</span>
                  <span className="text-yellow-600">Competent</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>5.0-5.5</span>
                  <span className="text-orange-600">Modest</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>4.0-4.5</span>
                  <span className="text-red-600">Limited</span>
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
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Scores
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assessment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
            <DialogDescription>
              Detailed feedback and score breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedAssessment && (
            <div className="space-y-6">
              {/* Score Display */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className={`text-4xl font-bold mb-2 ${getScoreColor(selectedAssessment.score).split(' ')[0]}`}>
                  {selectedAssessment.score}/9
                </div>
                <div className="text-sm text-gray-600">
                  IELTS Speaking Band Score
                </div>
              </div>

              {/* Test Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Test Date</div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{format(new Date(selectedAssessment.assessedAt), 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Examiner</div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{selectedAssessment.teacher?.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Test Center</div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedAssessment.booking?.slot?.branch?.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Time</div>
                  <div>
                    {selectedAssessment.booking?.slot?.startTime} - {selectedAssessment.booking?.slot?.endTime}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {selectedAssessment.remarks && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500">Examiner's Feedback</div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedAssessment.remarks}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setIsDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assessment Recording Dialog (Teacher) */}
      {isTeacher && (
        <Dialog open={isRecordingDialogOpen} onOpenChange={setIsRecordingDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Assessment</DialogTitle>
              <DialogDescription>
                Enter IELTS speaking score and feedback for the student
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">
                {/* Session Information */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Student</div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{selectedBooking.student?.name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Session Date</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {selectedBooking.slot?.date &&
                            format(new Date(selectedBooking.slot.date), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Time</div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {selectedBooking.slot?.startTime} - {selectedBooking.slot?.endTime}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-500">Branch</div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{selectedBooking.slot?.branch?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">IELTS Speaking Band Score</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        min="0"
                        max="9"
                        step="0.5"
                        value={assessmentForm.score}
                        onChange={(e) => setAssessmentForm(prev => ({
                          ...prev,
                          score: parseFloat(e.target.value) || 0
                        }))}
                        className="w-24 p-2 border rounded-md text-center text-lg font-bold"
                        placeholder="0.0"
                      />
                      <span className="text-sm text-gray-500">/ 9.0</span>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${assessmentForm.score >= 7 ? 'bg-green-100 text-green-700' :
                          assessmentForm.score >= 5.5 ? 'bg-yellow-100 text-yellow-700' :
                            assessmentForm.score > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {assessmentForm.score >= 7 ? 'Good' :
                          assessmentForm.score >= 5.5 ? 'Competent' :
                            assessmentForm.score > 0 ? 'Limited' : 'Not Set'}
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teacher's Feedback</label>
                    <textarea
                      value={assessmentForm.remarks}
                      onChange={(e) => setAssessmentForm(prev => ({
                        ...prev,
                        remarks: e.target.value
                      }))}
                      className="w-full p-3 border rounded-md"
                      rows={4}
                      placeholder="Provide detailed feedback on the student's performance, including strengths and areas for improvement..."
                    />
                  </div>
                </div>

                {/* IELTS Rubric Reference */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">IELTS Speaking Assessment Criteria</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                      <strong>Fluency & Coherence:</strong> Flow of speech, logical sequencing
                    </div>
                    <div>
                      <strong>Lexical Resource:</strong> Vocabulary range and accuracy
                    </div>
                    <div>
                      <strong>Grammatical Range:</strong> Grammar variety and accuracy
                    </div>
                    <div>
                      <strong>Pronunciation:</strong> Clarity and natural speech patterns
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsRecordingDialogOpen(false)
                      setAssessmentForm({ score: 0, remarks: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={assessmentForm.score === 0 || createAssessmentMutation.isPending}
                    onClick={() => {
                      if (selectedBooking) {
                        createAssessmentMutation.mutate({
                          bookingId: selectedBooking.id,
                          score: assessmentForm.score,
                          remarks: assessmentForm.remarks
                        })
                      }
                    }}
                  >
                    {createAssessmentMutation.isPending ? 'Recording...' : 'Record Assessment'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default Assessments