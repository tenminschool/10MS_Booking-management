import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { slotsAPI, branchesAPI, usersAPI, serviceTypesAPI, roomsAPI } from '@/lib/api'
import { UserRole, type Slot, type User, type Branch } from '@/types'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
  Building,
  Filter,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw
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
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, ...props }: any) => (
  <button 
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white' :
      variant === 'destructive' ? 'bg-orange-500 text-white hover:bg-orange-600' :
      variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white' :
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
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  } ${className}`}>
    {children}
  </span>
)

const AdminSlots: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
  const [showBulkCreate, setShowBulkCreate] = useState(false)

  // Get current week range for display
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)

  // Fetch slots based on filters
  const { data: slotsData, isLoading: slotsLoading, error: slotsError } = useQuery({
    queryKey: ['admin-slots', {
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
      teacherId: selectedTeacher || undefined,
      // Don't include date in queryKey since we're not filtering by it
      view
    }],
    queryFn: () => slotsAPI.getAll({
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
      teacherId: selectedTeacher || undefined,
      // Don't filter by date for admin - show all slots
      // date: format(selectedDate, 'yyyy-MM-dd'),
      view
    }),
  })

  // Fetch teachers (all teachers for super admin, branch teachers for branch admin)
  const { data: teachersData } = useQuery({
    queryKey: ['teachers', user?.role, user?.branchId],
    queryFn: () => {
      if (user?.role === UserRole.SUPER_ADMIN) {
        // Super admin can see all teachers
        return usersAPI.getAll({ role: UserRole.TEACHER })
      } else if (user?.branchId) {
        // Branch admin sees only their branch teachers
        return usersAPI.getByBranch(user.branchId, { role: UserRole.TEACHER })
      }
      return Promise.resolve({ data: { users: [] } })
    },
    enabled: true // Always enabled, logic is inside queryFn
  })

  // Fetch branches (for super admin)
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesAPI.getAll(),
    enabled: user?.role === UserRole.SUPER_ADMIN
  })

  const slots = (slotsData as any)?.data || []
  const teachers = (teachersData as any)?.data?.users || []
  const branches = (branchesData as any)?.data?.branches || []

  // Debug logging
  console.log('AdminSlots - slotsData:', slotsData)
  console.log('AdminSlots - slots:', slots)
  console.log('AdminSlots - slotsLoading:', slotsLoading)
  console.log('AdminSlots - slotsError:', slotsError)
  console.log('AdminSlots - teachersData:', teachersData)
  console.log('AdminSlots - teachers:', teachers)
  console.log('AdminSlots - user:', user)

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: slotsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      setShowCreateForm(false)
      successToast('Slot created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create slot')
    }
  })

  // Update slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => slotsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      setEditingSlot(null)
      successToast('Slot updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update slot')
    }
  })

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: slotsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      successToast('Slot deleted successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to delete slot')
    }
  })

  // Bulk create slots mutation
  const bulkCreateMutation = useMutation({
    mutationFn: slotsAPI.bulkCreate,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      setShowBulkCreate(false)
      successToast(`Successfully created ${(response as any).data?.slots?.length || 0} slots!`)
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create slots in bulk')
    }
  })

  const handleCreateSlot = (slotData: any) => {
    createSlotMutation.mutate({
      ...slotData,
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : slotData.branchId
    })
  }

  const handleUpdateSlot = (slotData: any) => {
    if (editingSlot) {
      updateSlotMutation.mutate({
        id: editingSlot.id,
        data: slotData
      })
    }
  }

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('Are you sure you want to delete this slot? This action cannot be undone.')) {
      deleteSlotMutation.mutate(slotId)
    }
  }

  const handleBulkCreate = (bulkData: any) => {
    bulkCreateMutation.mutate(bulkData)
  }

  const handleCopySlots = (sourceDate: Date, targetDate: Date) => {
    const sourceSlots = slots.filter((slot: Slot) =>
      format(new Date(slot.date), 'yyyy-MM-dd') === format(sourceDate, 'yyyy-MM-dd')
    )

    if (sourceSlots.length === 0) {
      errorToast('No slots found for the selected date to copy')
      return
    }

    const newSlots = sourceSlots.map((slot: Slot) => ({
      ...slot,
      date: format(targetDate, 'yyyy-MM-dd'),
      id: undefined // Let the backend generate new IDs
    }))

    bulkCreateMutation.mutate({ slots: newSlots })
  }

  // Generate week days for weekly view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  if (slotsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'Slot Management', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Slot Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.SUPER_ADMIN 
              ? 'Manage speaking test slots across all branches with advanced calendar controls'
              : `Create and manage speaking test slots for ${user?.branchId}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Export functionality */}}
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkCreate(true)}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Create
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Slot
          </Button>
        </div>
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
              
              {/* Date picker */}
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {/* Branch filter for Super Admin */}
              {user?.role === UserRole.SUPER_ADMIN && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch: Branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Teacher filter */}
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Teachers</option>
                {teachers.map((teacher: User) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {/* View toggle */}
              <select
                value={view}
                onChange={(e) => setView(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily View</option>
                <option value="weekly">Weekly View</option>
                <option value="monthly">Monthly View</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Navigation */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, view === 'monthly' ? -30 : -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {view === 'monthly' 
                  ? format(selectedDate, 'MMMM yyyy')
                  : `Week of ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
                }
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, view === 'monthly' ? 30 : 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots Grid */}
      {view === 'monthly' ? (
        <MonthlyCalendarView
          selectedDate={selectedDate}
          slots={slots}
          onEditSlot={setEditingSlot}
          onDeleteSlot={handleDeleteSlot}
          onCopySlots={handleCopySlots}
          user={user}
        />
      ) : view === 'weekly' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>
                Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const daySlots = slots.filter((slot: Slot) =>
                  format(new Date(slot.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                )

                return (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(day, 'MMM dd')}
                      </div>
                    </div>

                    <div className="space-y-2 min-h-[200px]">
                      {daySlots.map((slot: Slot) => (
                        <div
                          key={slot.id}
                          className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingSlot(slot)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-200"
                                title="Edit slot"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleCopySlots(day, addDays(day, 1))}
                                className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-200"
                                title="Copy to next day"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-200"
                                title="Delete slot"
                                disabled={slot.bookedCount > 0}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-gray-600">
                            {slot.teacher?.name}
                          </div>
                          {user?.role === UserRole.SUPER_ADMIN && slot.branch && (
                            <div className="text-gray-500 text-xs">
                              {slot.branch.name}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant={slot.bookedCount >= slot.capacity ? 'destructive' : 'success'}>
                              {slot.bookedCount}/{slot.capacity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add slot button for each day */}
                      <button
                        onClick={() => {
                          setSelectedDate(day)
                          setShowCreateForm(true)
                        }}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-xs"
                      >
                        <Plus className="w-3 h-3 mx-auto mb-1" />
                        Add Slot
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Slots for {format(selectedDate, 'MMMM dd, yyyy')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length > 0 ? (
              <div className="space-y-4">
                {slots.map((slot: Slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {slot.teacher?.name}
                          </span>
                        </div>
                        {user?.role === UserRole.SUPER_ADMIN && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {slot.branch?.name}
                            </span>
                          </div>
                        )}
                        {slot.serviceType && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {slot.serviceType.name}
                            </span>
                          </div>
                        )}
                        {slot.room && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {slot.room.roomNumber} - {slot.room.roomName}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={slot.bookedCount >= slot.capacity ? 'destructive' : 'success'}>
                          {slot.bookedCount}/{slot.capacity} booked
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {slot.capacity - slot.bookedCount} spots available
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSlot(slot)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={slot.bookedCount > 0}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No slots found for the selected date</p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Create First Slot
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Slot Modal */}
      {(showCreateForm || editingSlot) && (
        <SlotFormModal
          slot={editingSlot}
          teachers={teachers}
          branches={user?.role === UserRole.SUPER_ADMIN ? branches : undefined}
          userBranchId={user?.branchId}
          onSubmit={editingSlot ? handleUpdateSlot : handleCreateSlot}
          onClose={() => {
            setShowCreateForm(false)
            setEditingSlot(null)
          }}
          isLoading={createSlotMutation.isPending || updateSlotMutation.isPending}
        />
      )}

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <BulkCreateModal
          teachers={teachers}
          branches={user?.role === UserRole.SUPER_ADMIN ? branches : undefined}
          userBranchId={user?.branchId}
          onSubmit={handleBulkCreate}
          onClose={() => setShowBulkCreate(false)}
          isLoading={bulkCreateMutation.isPending}
        />
      )}
    </div>
  )
}

// Slot Form Modal Component
interface SlotFormModalProps {
  slot?: Slot | null
  teachers: User[]
  branches?: Branch[]
  userBranchId?: string
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const SlotFormModal: React.FC<SlotFormModalProps> = ({
  slot,
  teachers,
  branches,
  userBranchId,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    branchId: slot?.branchId || userBranchId || '',
    teacherId: slot?.teacherId || '',
    serviceTypeId: slot?.serviceTypeId || '',
    roomId: slot?.roomId || '',
    date: slot?.date ? format(new Date(slot.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: slot?.startTime || '09:00',
    endTime: slot?.endTime || '10:00',
    capacity: slot?.capacity || 1,
    price: slot?.price || ''
  })

  // Fetch service types and rooms
  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => serviceTypesAPI.getAll(),
    select: (response: any) => (response as any).data || []
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms', formData.branchId],
    queryFn: () => roomsAPI.getByBranch(formData.branchId),
    enabled: !!formData.branchId,
    select: (response: any) => (response as any).data || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {slot ? 'Edit Slot' : 'Create New Slot'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {branches && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Branch</option>
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teacher
            </label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher: User) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <select
              value={formData.serviceTypeId}
              onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Service Type</option>
              {serviceTypes?.map((serviceType: any) => (
                <option key={serviceType.id} value={serviceType.id}>
                  {serviceType.name} ({serviceType.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room (Optional)
            </label>
            <select
              value={formData.roomId}
              onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">No specific room</option>
              {rooms?.map((room: any) => (
                <option key={room.id} value={room.id}>
                  {room.roomNumber} - {room.roomName} (Capacity: {room.capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (BDT) - Optional
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Leave empty to use default service price"
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
              {isLoading ? 'Saving...' : (slot ? 'Update Slot' : 'Create Slot')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Monthly Calendar View Component
interface MonthlyCalendarViewProps {
  selectedDate: Date
  slots: Slot[]
  onEditSlot: (slot: Slot) => void
  onDeleteSlot: (slotId: string) => void
  onCopySlots: (sourceDate: Date, targetDate: Date) => void
  user: any
}

const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  selectedDate,
  slots,
  onEditSlot,
  user
}) => {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add empty days at the start to align with week
  const startDay = monthStart.getDay()
  const emptyDays = Array.from({ length: startDay }, (_, i) => addDays(monthStart, -startDay + i))
  const allDays = [...emptyDays, ...monthDays]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Monthly View - {format(selectedDate, 'MMMM yyyy')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {allDays.map((day) => {
            const daySlots = slots.filter((slot: Slot) =>
              isSameDay(new Date(slot.date), day)
            )
            const isCurrentMonth = day >= monthStart && day <= monthEnd
            const isToday = isSameDay(day, new Date())
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border border-gray-200 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-red-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && daySlots.length > 0 && (
                    <Badge variant="success" className="text-xs">
                      {daySlots.length}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  {daySlots.slice(0, 3).map((slot: Slot) => (
                    <div
                      key={slot.id}
                      className="p-1 bg-blue-50 border border-blue-200 rounded text-xs hover:bg-blue-100 cursor-pointer"
                      onClick={() => onEditSlot(slot)}
                    >
                      <div className="font-medium">
                        {slot.startTime}-{slot.endTime}
                      </div>
                      <div className="text-gray-600 truncate">
                        {slot.teacher?.name}
                      </div>
                      {user?.role === UserRole.SUPER_ADMIN && slot.branch && (
                        <div className="text-gray-500 truncate">
                          {slot.branch.name}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {daySlots.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{daySlots.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Bulk Create Modal Component
interface BulkCreateModalProps {
  teachers: User[]
  branches?: Branch[]
  userBranchId?: string
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const BulkCreateModal: React.FC<BulkCreateModalProps> = ({
  teachers,
  branches,
  userBranchId,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    branchId: userBranchId || '',
    teacherId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    timeSlots: [
      { startTime: '09:00', endTime: '10:00', capacity: 1 },
      { startTime: '10:30', endTime: '11:30', capacity: 1 },
      { startTime: '14:00', endTime: '15:00', capacity: 1 }
    ],
    weekdays: [1, 2, 3, 4, 5], // Monday to Friday
    skipWeekends: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { startTime: '09:00', endTime: '10:00', capacity: 1 }]
    })
  }

  const removeTimeSlot = (index: number) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index)
    })
  }

  const updateTimeSlot = (index: number, field: string, value: any) => {
    const newTimeSlots = [...formData.timeSlots]
    newTimeSlots[index] = { ...newTimeSlots[index], [field]: value }
    setFormData({ ...formData, timeSlots: newTimeSlots })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Bulk Create Slots</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {branches && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Branch</option>
                {branches.map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teacher
            </label>
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher: User) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Slots
            </label>
            <div className="space-y-2">
              {formData.timeSlots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateTimeSlot(index, 'startTime', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateTimeSlot(index, 'endTime', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={slot.capacity}
                    onChange={(e) => updateTimeSlot(index, 'capacity', parseInt(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                    required
                  />
                  <span className="text-sm text-gray-500">capacity</span>
                  {formData.timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Time Slot
              </button>
            </div>
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
              {isLoading ? 'Creating...' : 'Create Slots'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminSlots