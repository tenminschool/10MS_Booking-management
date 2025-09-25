import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { slotsAPI, branchesAPI, usersAPI } from '@/lib/api'
import { UserRole, type Slot, type User, type Branch } from '@/types'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  MapPin,
  Filter,
  Download,
  Upload
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
    'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

const AdminSlots: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)

  // Get current week range for display
  const weekStart = startOfWeek(selectedDate)
  const weekEnd = endOfWeek(selectedDate)

  // Fetch slots based on filters
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['admin-slots', {
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
      teacherId: selectedTeacher || undefined,
      date: format(selectedDate, 'yyyy-MM-dd'),
      view
    }],
    queryFn: () => slotsAPI.getAvailable({
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
      teacherId: selectedTeacher || undefined,
      date: format(selectedDate, 'yyyy-MM-dd'),
      view
    }),
  })

  // Fetch teachers for the branch
  const { data: teachersData } = useQuery({
    queryKey: ['branch-teachers', user?.branchId],
    queryFn: () => usersAPI.getByBranch(user?.branchId!, { role: UserRole.TEACHER }),
    enabled: !!user?.branchId
  })

  // Fetch branches (for super admin)
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesAPI.getAll(),
    enabled: user?.role === UserRole.SUPER_ADMIN
  })

  const slots = slotsData?.data || []
  const teachers = teachersData?.data?.users || []
  const branches = branchesData?.data || []

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: slotsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      setShowCreateForm(false)
    }
  })

  // Update slot mutation
  const updateSlotMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => slotsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
      setEditingSlot(null)
    }
  })

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: slotsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] })
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
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slot Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage speaking test slots
            {user?.role === UserRole.BRANCH_ADMIN && ` for ${user.branchId}`}
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Export functionality */}}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Slot
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
              
              {/* Date picker */}
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />

              {/* Teacher filter */}
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((viewOption) => (
                <button
                  key={viewOption}
                  onClick={() => setView(viewOption)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    view === viewOption
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots Grid */}
      {view === 'weekly' ? (
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
                const daySlots = slots.filter(slot => 
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
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-2 bg-blue-50 border border-blue-200 rounded-md text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingSlot(slot)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-gray-600">
                            {slot.teacher?.name}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant={slot.bookedCount >= slot.capacity ? 'destructive' : 'success'}>
                              {slot.bookedCount}/{slot.capacity}
                            </Badge>
                          </div>
                        </div>
                      ))}
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
                {slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
    date: slot?.date ? format(new Date(slot.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: slot?.startTime || '09:00',
    endTime: slot?.endTime || '10:00',
    capacity: slot?.capacity || 1
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
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
                {branches.map((branch) => (
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
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
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
              {isLoading ? 'Saving...' : (slot ? 'Update Slot' : 'Create Slot')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminSlots