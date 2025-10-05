import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { usersAPI, branchesAPI } from '@/lib/api'
import { UserRole, type User, type Branch } from '@/types'
import { format } from 'date-fns'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  GraduationCap,
  Crown,
  Building,
  UserCog
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

const AdminUsers: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const successToast = useSuccessToast()
  const errorToast = useErrorToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [branchFilter, setBranchFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">Only Super Admins can manage users across all branches.</p>
        </div>
      </div>
    )
  }

  // Fetch users based on filters
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', {
      role: roleFilter || undefined,
      search: searchTerm || undefined,
      branchId: branchFilter || undefined,
      isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      page,
      limit
    }],
        queryFn: async () => {
          const response = await usersAPI.getAll({
          role: roleFilter || undefined,
          search: searchTerm || undefined,
            branchId: branchFilter || undefined,
            isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
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

  const users = usersData?.users || []
  const pagination = usersData?.pagination
  const branches = branchesData?.branches || []

  // Create user mutation
  const createUserMutation = useMutation({
        mutationFn: async (data: any) => {
          const response = await usersAPI.create(data)
          return (response as any).data
        },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateForm(false)
      successToast('User created successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to create user')
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
          const response = await usersAPI.update(id, data)
          return (response as any).data
        },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditingUser(null)
      successToast('User updated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to update user')
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
          const response = await usersAPI.delete(id)
          return (response as any).data
        },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      successToast('User deactivated successfully!')
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.message || 'Failed to deactivate user')
    }
  })

  const handleCreateUser = (userData: any) => {
    createUserMutation.mutate(userData)
  }

  const handleUpdateUser = (userData: any) => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        data: userData
      })
    }
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to deactivate this user? This action can be reversed later.')) {
      deleteUserMutation.mutate(userId)
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return <Crown className="w-4 h-4 text-purple-600" />
      case UserRole.BRANCH_ADMIN:
        return <Building className="w-4 h-4 text-blue-600" />
      case UserRole.TEACHER:
        return <GraduationCap className="w-4 h-4 text-green-600" />
      case UserRole.STUDENT:
        return <UserCog className="w-4 h-4 text-orange-600" />
      default:
        return <Users className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'destructive'
      case UserRole.BRANCH_ADMIN:
        return 'default'
      case UserRole.TEACHER:
        return 'default'
      case UserRole.STUDENT:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getUserStats = () => {
    const total = users.length
    const active = users.filter((u: any) => u.isActive).length
    const inactive = users.filter((u: any) => !u.isActive).length
    const superAdmins = users.filter((u: any) => u.role === UserRole.SUPER_ADMIN).length
    const branchAdmins = users.filter((u: any) => u.role === UserRole.BRANCH_ADMIN).length
    const teachers = users.filter((u: any) => u.role === UserRole.TEACHER).length
    const students = users.filter((u: any) => u.role === UserRole.STUDENT).length

    return { total, active, inactive, superAdmins, branchAdmins, teachers, students }
  }

  const stats = getUserStats()

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin' },
    { label: 'User Management', current: true }
  ]

  return (
    <div className="space-y-6 bg-background dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all users across all branches with complete control and analytics
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
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <UserCheck className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Teachers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.teachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <UserCog className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.students}</p>
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Roles</option>
                <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
                <option value={UserRole.TEACHER}>Teacher</option>
                <option value={UserRole.STUDENT}>Student</option>
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid/Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user: any) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{user.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        {user.isActive ? (
                          <UserCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <UserX className="w-4 h-4 text-red-600" />
                        )}
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    {getRoleIcon(user.role)}
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  
                  {user.phoneNumber && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span>{user.phoneNumber}</span>
                    </div>
                  )}

                  {user.branch && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{user.branch.name}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Created {format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <div className="col-span-full">
              <Card>
                <CardContent>
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No users found</p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Add First User
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
              <Users className="w-5 h-5" />
              <span>Users Table</span>
            </CardTitle>
            <CardDescription>
              Detailed view of all users with their information and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Branch</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(user.role)}
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                          {user.phoneNumber && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.phoneNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {user.branch?.name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} users
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

      {/* Create/Edit User Modal */}
      {(showCreateForm || editingUser) && (
        <UserFormModal
          user={editingUser}
          branches={branches}
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          onClose={() => {
            setShowCreateForm(false)
            setEditingUser(null)
          }}
          isLoading={createUserMutation.isPending || updateUserMutation.isPending}
        />
      )}
    </div>
  )
}

// User Form Modal Component
interface UserFormModalProps {
  user?: User | null
  branches: Branch[]
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  branches,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState<{
    name: string
    email: string
    phoneNumber: string
    role: UserRole
    branchId: string
    password: string
    isActive: boolean
  }>({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    role: (user?.role as UserRole) || UserRole.STUDENT,
    branchId: user?.branchId || '',
    password: '',
    isActive: user?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = { ...formData }
    if (!submitData.password) {
      delete (submitData as any).password
    }
    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {user ? 'Edit User' : 'Create New User'}
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
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
              <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
              <option value={UserRole.TEACHER}>Teacher</option>
              <option value={UserRole.STUDENT}>Student</option>
            </select>
          </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Branch *
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          {(formData.role as UserRole) !== UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required={(formData.role as UserRole) !== UserRole.STUDENT}
              />
            </div>
          )}

          {formData.role === UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+8801234567890"
                required={formData.role === UserRole.STUDENT}
              />
            </div>
          )}

          {(formData.role as UserRole) !== UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password {!user && '*'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required={!user}
                placeholder={user ? 'Leave blank to keep current password' : ''}
              />
            </div>
          )}

          {user && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active User
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
              variant="destructive"
            >
              {isLoading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminUsers