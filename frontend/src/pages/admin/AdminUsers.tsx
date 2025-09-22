import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { usersAPI, branchesAPI } from '@/lib/api'
import { UserRole, type User, type Branch } from '@/types'
import { format } from 'date-fns'
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
  MapPin
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
    variant === 'outline' ? 'border border-gray-300 bg-white text-gray-700' :
    'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

const AdminUsers: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch users based on role and filters
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', {
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : undefined,
      role: roleFilter || undefined,
      search: searchTerm || undefined,
      page,
      limit
    }],
    queryFn: () => {
      if (user?.role === UserRole.BRANCH_ADMIN) {
        return usersAPI.getByBranch(user.branchId!, {
          role: roleFilter || undefined,
          search: searchTerm || undefined,
          page,
          limit
        })
      } else {
        // Super admin gets all users across all branches
        return usersAPI.getAll({
          role: roleFilter || undefined,
          search: searchTerm || undefined,
          page,
          limit
        })
      }
    },
  })

  // Fetch branches (for super admin)
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesAPI.getAll(),
    enabled: user?.role === UserRole.SUPER_ADMIN
  })

  const users = usersData?.data?.users || []
  const pagination = usersData?.data?.pagination
  const branches = branchesData?.data || []

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateForm(false)
    }
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditingUser(null)
    }
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    }
  })

  const handleCreateUser = (userData: any) => {
    createUserMutation.mutate({
      ...userData,
      branchId: user?.role === UserRole.BRANCH_ADMIN ? user.branchId : userData.branchId
    })
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

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'destructive'
      case UserRole.BRANCH_ADMIN:
        return 'default'
      case UserRole.TEACHER:
        return 'success'
      case UserRole.STUDENT:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const filteredUsers = users.filter(u => {
    if (statusFilter === 'active' && !u.isActive) return false
    if (statusFilter === 'inactive' && u.isActive) return false
    return true
  })

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === UserRole.SUPER_ADMIN 
              ? 'Manage users across all branches and assign permissions'
              : `Manage users and their permissions for ${user?.branchId || 'your branch'}`
            }
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-red-600 hover:bg-red-700 mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm w-64"
                />
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Roles</option>
                {user?.role === UserRole.SUPER_ADMIN && (
                  <>
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    <option value={UserRole.BRANCH_ADMIN}>Branch Admin</option>
                  </>
                )}
                <option value={UserRole.TEACHER}>Teacher</option>
                <option value={UserRole.STUDENT}>Student</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | '')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              {pagination?.total || 0} users total
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Users</span>
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {user.isActive ? (
                          <UserCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <UserX className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {user.name}
                        </span>
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      {user.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-4 h-4" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                      {user.branch && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{user.branch.name}</span>
                        </div>
                      )}
                      <span className="text-xs">
                        Created {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
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
                    <span className="text-sm text-gray-600">
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
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No users found</p>
              <Button onClick={() => setShowCreateForm(true)}>
                Add First User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      {(showCreateForm || editingUser) && (
        <UserFormModal
          user={editingUser}
          branches={user?.role === UserRole.SUPER_ADMIN ? branches : undefined}
          userBranchId={user?.branchId}
          userRole={user?.role}
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
  branches?: Branch[]
  userBranchId?: string
  userRole?: UserRole
  onSubmit: (data: any) => void
  onClose: () => void
  isLoading: boolean
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  branches,
  userBranchId,
  userRole,
  onSubmit,
  onClose,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    role: user?.role || UserRole.STUDENT,
    branchId: user?.branchId || userBranchId || '',
    password: '',
    isActive: user?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = { ...formData }
    if (!submitData.password) {
      delete submitData.password
    }
    onSubmit(submitData)
  }

  const availableRoles = userRole === UserRole.BRANCH_ADMIN 
    ? [UserRole.TEACHER, UserRole.STUDENT]
    : [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.STUDENT]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {user ? 'Edit User' : 'Create New User'}
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
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {branches && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
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

          {formData.role !== UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required={formData.role !== UserRole.STUDENT}
              />
            </div>
          )}

          {formData.role === UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="+8801234567890"
                required={formData.role === UserRole.STUDENT}
              />
            </div>
          )}

          {formData.role !== UserRole.STUDENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {!user && '*'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
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
              className="bg-red-600 hover:bg-red-700"
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