import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Plus, 
  Send,
  Clock,
  Save
} from 'lucide-react';
import { UserRole } from '../types';

interface NotificationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TargetUsers {
  userIds: string[];
  roles: UserRole[];
  branchIds: string[];
  allUsers: boolean;
}

const NotificationCreateModal: React.FC<NotificationCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT',
    tags: [] as string[],
    scheduledAt: '',
    actionUrl: '',
    metadata: {} as Record<string, any>
  });

  const [targetUsers, setTargetUsers] = useState<TargetUsers>({
    userIds: [],
    roles: [],
    branchIds: [],
    allUsers: false
  });

  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  const notificationTypes = [
    { value: 'ANNOUNCEMENT', label: 'Announcement', color: 'bg-blue-100 text-blue-800' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
    { value: 'REMINDER', label: 'Reminder', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'SYSTEM_ALERT', label: 'System Alert', color: 'bg-purple-100 text-purple-800' }
  ];

  const userRoles = [
    { value: UserRole.STUDENT, label: 'Students' },
    { value: UserRole.TEACHER, label: 'Teachers' },
    { value: UserRole.BRANCH_ADMIN, label: 'Branch Admins' },
    { value: UserRole.SUPER_ADMIN, label: 'Super Admins' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTargetUsersChange = (field: keyof TargetUsers, value: any) => {
    setTargetUsers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          targetUsers
        })
      });

      if (response.ok) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || 'Failed to create notification'}`);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'ANNOUNCEMENT',
      tags: [],
      scheduledAt: '',
      actionUrl: '',
      metadata: {}
    });
    setTargetUsers({
      userIds: [],
      roles: [],
      branchIds: [],
      allUsers: false
    });
    setNewTag('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <span>Create Notification</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter notification title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  placeholder="Enter notification message"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {notificationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="actionUrl">Action URL (Optional)</Label>
                <Input
                  id="actionUrl"
                  value={formData.actionUrl}
                  onChange={(e) => handleInputChange('actionUrl', e.target.value)}
                  placeholder="https://example.com/page"
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL to navigate to when notification is clicked
                </p>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4">
              <div>
                <Label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={targetUsers.allUsers}
                    onChange={(e) => handleTargetUsersChange('allUsers', e.target.checked)}
                    className="rounded"
                  />
                  <span>Send to all users</span>
                </Label>
              </div>

              <div>
                <Label>Target by Role</Label>
                <div className="space-y-2 mt-2">
                  {userRoles.map(role => (
                    <label key={role.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={targetUsers.roles.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleTargetUsersChange('roles', [...targetUsers.roles, role.value]);
                          } else {
                            handleTargetUsersChange('roles', targetUsers.roles.filter(r => r !== role.value));
                          }
                        }}
                        className="rounded"
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="userIds">Specific User IDs (Optional)</Label>
                <Textarea
                  id="userIds"
                  placeholder="Enter user IDs separated by commas"
                  rows={3}
                  onChange={(e) => {
                    const userIds = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                    handleTargetUsersChange('userIds', userIds);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of specific user IDs to target
                </p>
              </div>
            </TabsContent>

            <TabsContent value="scheduling" className="space-y-4">
              <div>
                <Label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!!formData.scheduledAt}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        handleInputChange('scheduledAt', '');
                      } else {
                        const now = new Date();
                        now.setMinutes(now.getMinutes() + 5); // Default to 5 minutes from now
                        handleInputChange('scheduledAt', now.toISOString().slice(0, 16));
                      }
                    }}
                    className="rounded"
                  />
                  <span>Schedule for later</span>
                </Label>
              </div>

              {formData.scheduledAt && (
                <div>
                  <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Scheduling Options</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Send Now:</strong> Notification will be sent immediately</li>
                  <li>• <strong>Schedule:</strong> Notification will be sent at the specified time</li>
                  <li>• <strong>Draft:</strong> Save as draft for later editing and sending</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => {/* TODO: Save as draft */}}>
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button type="submit" disabled={loading}>
              {formData.scheduledAt ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule Notification
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationCreateModal;
