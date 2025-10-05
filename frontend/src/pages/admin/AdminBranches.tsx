import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { branchesAPI, roomsAPI } from '@/lib/api'
import { UserRole, type Branch, type Room, RoomType } from '@/types'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Building,
  Phone,
  Users,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  Shield
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
const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' :
    variant === 'destructive' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400' :
    variant === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
    variant === 'outline' ? 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
  }`}>
    {children}
  </span>
)

const AdminBranches: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [selectedBranchForRooms, setSelectedBranchForRooms] = useState<string | null>(null)

  // Only super admins can access this page
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Only Super Admins can manage branches across the system.</p>
        </div>
      </div>
    )
  }

  // Fetch branches
  const { data: branchesData, isLoading: branchesLoading, error: branchesError } = useQuery({
    queryKey: ['admin-branches', searchTerm],
    queryFn: () => {
      console.log('useQuery queryFn called for branches')
      return branchesAPI.getAll()
    },
    enabled: true,
    retry: 1,
  })

  const branches = (branchesData as any)?.data?.branches || []

  // Debug logging
  console.log('AdminBranches - branchesData:', branchesData)
  console.log('AdminBranches - branches:', branches)
  console.log('AdminBranches - branchesLoading:', branchesLoading)
  console.log('AdminBranches - branchesError:', branchesError)

  // Create branch mutation
  const createBranchMutation = useMutation({
    mutationFn: branchesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] })
      setShowCreateForm(false)
      successToast('Branch created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create branch')
    }
  })

  // Update branch mutation
  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => branchesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] })
      setEditingBranch(null)
      successToast('Branch updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update branch')
    }
  })

  // Delete branch mutation
  const deleteBranchMutation = useMutation({
    mutationFn: branchesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-branches'] })
      successToast('Branch deactivated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to deactivate branch')
    }
  })

  // Fetch rooms for selected branch
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', selectedBranchForRooms],
    queryFn: () => roomsAPI.getByBranch(selectedBranchForRooms!),
    enabled: !!selectedBranchForRooms,
  })

  const rooms = (roomsData as any)?.data || []

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: roomsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setShowRoomForm(false)
      successToast('Room created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create room')
    }
  })

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => roomsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setEditingRoom(null)
      successToast('Room updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update room')
    }
  })

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: roomsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      successToast('Room deleted successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to delete room')
    }
  })

  const handleCreateBranch = (branchData: any) => {
    createBranchMutation.mutate(branchData)
  }

  const handleUpdateBranch = (branchData: any) => {
    if (editingBranch) {
      updateBranchMutation.mutate({
        id: editingBranch.id,
        data: branchData
      })
    }
  }

  const handleDeleteBranch = (branchId: string) => {
    if (confirm('Are you sure you want to deactivate this branch? This action can be reversed later.')) {
      deleteBranchMutation.mutate(branchId)
    }
  }

  // Room management handlers
  const handleCreateRoom = (roomData: any) => {
    createRoomMutation.mutate({
      ...roomData,
      branchId: selectedBranchForRooms
    })
  }

  const handleUpdateRoom = (roomData: any) => {
    if (editingRoom) {
      updateRoomMutation.mutate({
        id: editingRoom.id,
        data: roomData
      })
    }
  }

  const handleDeleteRoom = (roomId: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      deleteRoomMutation.mutate(roomId)
    }
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setShowRoomForm(true)
  }

  const handleManageRooms = (branchId: string) => {
    setSelectedBranchForRooms(branchId)
    setShowRoomForm(false)
    setEditingRoom(null)
  }

  const filteredBranches = (branches || []).filter((branch: any) =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (branchesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'Branch Management', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all branches across the system with advanced analytics and controls
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 text-white mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Building className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Branches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(branches || []).length}</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Branches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(branches || []).filter((b: any) => b.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(branches || []).reduce((sum: number, b: any) => sum + (b._count?.users || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
              <Calendar className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Slots</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(branches || []).reduce((sum: number, b: any) => sum + (b._count?.slots || 0), 0)}
                </p>
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
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                <option value="dhaka">Dhaka</option>
                <option value="chittagong">Chittagong</option>
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

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBranches.map((branch: any) => (
          <Card key={branch.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-base">{branch.name}</CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                  {branch.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <Badge variant={branch.isActive ? 'success' : 'destructive'}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    {branch.address}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div className="text-sm text-gray-600">
                    {branch.contactNumber}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <div className="text-sm text-gray-600">
                    {branch._count?.users || 0} users
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created {format(new Date(branch.createdAt), 'MMM dd, yyyy')}
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleManageRooms(branch.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Building className="w-4 h-4 mr-2" />
                    Manage Rooms
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBranch(branch)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteBranch(branch.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {branch.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredBranches.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? 'No branches found matching your search' : 'No branches found'}
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    Add First Branch
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Branch Modal */}
      {(showCreateForm || editingBranch) && (
        <BranchFormModal
          branch={editingBranch}
          onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch}
          onClose={() => {
            setShowCreateForm(false)
            setEditingBranch(null)
          }}
          isLoading={createBranchMutation.isPending || updateBranchMutation.isPending}
        />
      )}

      {/* Room Management Modal */}
      {selectedBranchForRooms && (
        <RoomManagementModal
          branchName={branches.find((b: any) => b.id === selectedBranchForRooms)?.name || ''}
          rooms={rooms}
          isLoading={roomsLoading}
          showRoomForm={showRoomForm}
          editingRoom={editingRoom}
          onCreateRoom={handleCreateRoom}
          onUpdateRoom={handleUpdateRoom}
          onDeleteRoom={handleDeleteRoom}
          onEditRoom={handleEditRoom}
          onClose={() => {
            setSelectedBranchForRooms(null)
            setShowRoomForm(false)
            setEditingRoom(null)
          }}
          onShowRoomForm={() => setShowRoomForm(true)}
          onCloseRoomForm={() => {
            setShowRoomForm(false)
            setEditingRoom(null)
          }}
          isCreating={createRoomMutation.isPending}
          isUpdating={updateRoomMutation.isPending}
        />
      )}
    </div>
  )
}

// Branch Form Modal Component
interface BranchFormModalProps {
  branch?: Branch | null
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const BranchFormModal: React.FC<BranchFormModalProps> = ({
  branch,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    contactNumber: branch?.contactNumber || '',
    isActive: branch?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {branch ? 'Edit Branch' : 'Create New Branch'}
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
              Branch Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="e.g., Dhaka Main Branch"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              required
              placeholder="Full address of the branch"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number *
            </label>
            <input
              type="tel"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="+8801234567890"
            />
          </div>

          {branch && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active Branch
              </label>
            </div>
          )}

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
              {isLoading ? 'Saving...' : (branch ? 'Update Branch' : 'Create Branch')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Room Management Modal Component
interface RoomManagementModalProps {
  branchName: string
  rooms: Room[]
  isLoading: boolean
  showRoomForm: boolean
  editingRoom: Room | null
  onCreateRoom: (data: any) => void
  onUpdateRoom: (data: any) => void
  onDeleteRoom: (id: string) => void
  onEditRoom: (room: Room) => void
  onClose: () => void
  onShowRoomForm: () => void
  onCloseRoomForm: () => void
  isCreating: boolean
  isUpdating: boolean
}

const RoomManagementModal: React.FC<RoomManagementModalProps> = ({
  branchName,
  rooms,
  isLoading,
  showRoomForm,
  editingRoom,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onEditRoom,
  onClose,
  onShowRoomForm,
  onCloseRoomForm,
  isCreating,
  isUpdating
}) => {
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomName: '',
        roomType: 'computer_lab',
    capacity: 1,
    equipment: [] as string[],
    isActive: true
  })

  React.useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        roomName: editingRoom.roomName,
        roomType: editingRoom.roomType.toLowerCase(),
        capacity: editingRoom.capacity,
        equipment: editingRoom.equipment,
        isActive: editingRoom.isActive
      })
    } else {
      setFormData({
        roomNumber: '',
        roomName: '',
        roomType: 'computer_lab',
        capacity: 1,
        equipment: [],
        isActive: true
      })
    }
  }, [editingRoom, showRoomForm])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      roomType: formData.roomType as RoomType
    }
    if (editingRoom) {
      onUpdateRoom(submitData)
    } else {
      onCreateRoom(submitData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Rooms - {branchName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add and manage rooms for this branch
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!showRoomForm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Rooms ({rooms.length})
                </h3>
                <Button
                  onClick={onShowRoomForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No rooms added yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Add rooms to organize spaces for different services
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room: any) => (
                    <Card key={room.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {room.roomName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Room #{room.roomNumber}
                            </p>
                          </div>
                          <Badge variant={room.isActive ? 'success' : 'destructive'}>
                            {room.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4" />
                            <span className="capitalize">{room.roomType.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>Capacity: {room.capacity}</span>
                          </div>
                          {room.equipment.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs">Equipment: {room.equipment.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditRoom(room)}
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteRoom(room.id)}
                            className="flex-1"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h3>
                <Button variant="outline" onClick={onCloseRoomForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., R101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={formData.roomName}
                    onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Computer Lab A"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Type
                  </label>
                  <select
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="general">General</option>
                    <option value="computer_lab">Computer Lab</option>
                    <option value="counselling">Counselling</option>
                    <option value="exam_hall">Exam Hall</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Equipment (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.equipment.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    equipment: e.target.value.split(',').map(item => item.trim()).filter(item => item) 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Computer, Projector, Whiteboard"
                />
              </div>

              {editingRoom && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Room
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseRoomForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingRoom ? 'Update Room' : 'Create Room'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminBranches