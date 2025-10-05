import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { User, Mail, Phone, Building, Calendar, Edit2, Save, X } from 'lucide-react'
import { useSuccessToast, useErrorToast } from '@/components/ui/toast'

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth()
  const showSuccessToast = useSuccessToast()
  const showErrorToast = useErrorToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || ''
  })

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || ''
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || ''
    })
  }

  const handleSave = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // In a real implementation, you would call an API to update the user
      // For now, we'll simulate the update
      const updatedUser = {
        ...user,
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      updateUser(updatedUser)
      setIsEditing(false)
      showSuccessToast('Profile updated successfully')
    } catch (error) {
      showErrorToast('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const breadcrumbItems = [
    { label: 'Profile', current: true }
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Breadcrumb items={breadcrumbItems} />

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
              </div>
            </div>

            {!isEditing ? (
              <Button 
                onClick={handleEdit} 
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
                variant="default"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{user.name}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your email address"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{user.email || 'Not provided'}</span>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{user.phoneNumber || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h2>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <Badge variant="secondary" className="text-sm">
                  {user.role?.replace('_', ' ') || 'User'}
                </Badge>
              </div>

              {/* Branch */}
              {user.branch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span>{user.branch.name}</span>
                  </div>
                </div>
              )}

              {/* Account Created */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member Since
                </label>
                <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : 'January 1, 2024'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile