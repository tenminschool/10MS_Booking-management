import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceTypesAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, ServiceCategory } from '@/types'
import type { ServiceType } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Plus, Edit, Trash2, Clock, Users, DollarSign } from 'lucide-react'

interface ServiceTypeFormData {
  name: string
  code: string
  description: string
  category: ServiceCategory
  defaultCapacity: number
  durationMinutes: number
}

const AdminServiceTypes: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null)
  const [formData, setFormData] = useState<ServiceTypeFormData>({
    name: '',
    code: '',
    description: '',
    category: ServiceCategory.PAID,
    defaultCapacity: 1,
    durationMinutes: 60
  })

  // Fetch service types
  const { data: serviceTypes, isLoading, error } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => serviceTypesAPI.getAll(),
    select: (response) => (response as any).data || []
  })

  // Create service type mutation
  const createMutation = useMutation({
    mutationFn: serviceTypesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] })
      setIsCreateModalOpen(false)
      resetForm()
    }
  })

  // Update service type mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => serviceTypesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] })
      setEditingServiceType(null)
      resetForm()
    }
  })

  // Delete service type mutation
  const deleteMutation = useMutation({
    mutationFn: serviceTypesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] })
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: ServiceCategory.PAID,
      defaultCapacity: 1,
      durationMinutes: 60
    })
  }

  const handleCreate = () => {
    createMutation.mutate(formData)
  }

  const handleUpdate = () => {
    if (editingServiceType) {
      updateMutation.mutate({
        id: editingServiceType.id,
        data: formData
      })
    }
  }

  const handleEdit = (serviceType: ServiceType) => {
    setEditingServiceType(serviceType)
    setFormData({
      name: serviceType.name,
      code: serviceType.code,
      description: serviceType.description || '',
      category: serviceType.category,
      defaultCapacity: serviceType.defaultCapacity,
      durationMinutes: serviceType.durationMinutes
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this service type?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  // Check if user has admin access
  if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.BRANCH_ADMIN)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-orange-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error Loading Service Types</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Types Management</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage different types of services available for booking
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                resetForm()
                setEditingServiceType(null)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingServiceType ? 'Edit Service Type' : 'Create New Service Type'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., CBT Full Mock"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Service Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CBT_FULL_MOCK"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: ServiceCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ServiceCategory.PAID}>Paid Service</SelectItem>
                    <SelectItem value={ServiceCategory.FREE}>Free Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Default Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.defaultCapacity}
                    onChange={(e) => setFormData({ ...formData, defaultCapacity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="480"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={editingServiceType ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {editingServiceType ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {serviceTypes?.map((serviceType: any) => (
          <Card key={serviceType.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{serviceType.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    Code: {serviceType.code}
                  </CardDescription>
                </div>
                <Badge variant={serviceType.category === ServiceCategory.PAID ? 'default' : 'secondary'}>
                  {serviceType.category === ServiceCategory.PAID ? (
                    <>
                      <DollarSign className="w-3 h-3 mr-1" />
                      Paid
                    </>
                  ) : (
                    'Free'
                  )}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {serviceType.description || 'No description provided'}
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {serviceType.defaultCapacity} person{serviceType.defaultCapacity > 1 ? 's' : ''}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(serviceType.durationMinutes)}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(serviceType)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(serviceType.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {serviceTypes?.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Service Types</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get started by creating your first service type.
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminServiceTypes
