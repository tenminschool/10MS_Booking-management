import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Bell, 
  Plus, 
  Search, 
  Filter, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  Tag,
  Calendar,
  Eye,
  Edit,
  Trash2,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  tags: string[];
  scheduledAt?: string;
  sentAt?: string;
  readAt?: string;
  actionUrl?: string;
  user: {
    id: string;
    name: string;
    role: string;
    branchId?: string;
  };
  createdByUser?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

interface NotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  sentToday: number;
  scheduledNotifications: number;
  notificationsByType: Record<string, number>;
}

const NotificationManagement: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check if user has admin access
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BRANCH_ADMIN;

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      fetchStats();
    }
  }, [isAdmin]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSendNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/notifications/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchNotifications();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchNotifications();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'SCHEDULED':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'DRAFT':
        return <Edit className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return 'bg-blue-100 text-blue-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800';
      case 'REMINDER':
        return 'bg-yellow-100 text-yellow-800';
      case 'SYSTEM_ALERT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || notification.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || notification.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600">Create, schedule, and manage notifications for students and teachers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Notification</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalNotifications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unreadNotifications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Sent Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.sentToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.scheduledNotifications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="URGENT">Urgent</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="REMINDER">Reminder</option>
              <option value="SYSTEM_ALERT">System Alert</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="SENT">Sent</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="FAILED">Failed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications ({filteredNotifications.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">Create your first notification to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div key={notification.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>
                          {getStatusIcon(notification.status)}
                          <span className="ml-1">{notification.status}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>To: {notification.user.name} ({notification.user.role})</span>
                        <span>Created: {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                        {notification.scheduledAt && (
                          <span>Scheduled: {format(new Date(notification.scheduledAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                        {notification.sentAt && (
                          <span>Sent: {format(new Date(notification.sentAt), 'MMM dd, yyyy HH:mm')}</span>
                        )}
                      </div>
                      
                      {notification.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {notification.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendNotification(notification.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send Now
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {/* TODO: Edit notification */}}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationManagement;
