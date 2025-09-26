import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Bell,
  BellRing, 
  CheckCircle, 
  Clock,
  ExternalLink,
  Filter,
  Search,
  MarkAsRead,
  MarkAsUnread,
  Archive,
  Tag,
  Calendar
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  tags: string[];
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if user can view notifications
  const canViewNotifications = user?.role === UserRole.STUDENT || user?.role === UserRole.TEACHER;

  useEffect(() => {
    if (canViewNotifications) {
      fetchNotifications();
    }
  }, [canViewNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ notificationIds })
      });
      
      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ markAll: true })
      });
      
      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await handleMarkAsRead([notification.id]);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    } else {
      // Get action URL from API
      try {
        const response = await fetch(`/api/notifications/${notification.id}/action`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.actionUrl) {
            window.location.href = data.actionUrl;
          }
        }
      } catch (error) {
        console.error('Error getting notification action:', error);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'URGENT':
        return <BellRing className="w-4 h-4 text-red-500" />;
      case 'MAINTENANCE':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'REMINDER':
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'SYSTEM_ALERT':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
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

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE \'at\' HH:mm');
    } else {
      return format(date, 'MMM dd, yyyy \'at\' HH:mm');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || notification.type === selectedType;
    
    let matchesTab = true;
    if (activeTab === 'unread') {
      matchesTab = !notification.isRead;
    } else if (activeTab === 'read') {
      matchesTab = notification.isRead;
    }
    
    return matchesSearch && matchesType && matchesTab;
  });

  if (!canViewNotifications) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Bell className="w-6 h-6" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600">Stay updated with important announcements and reminders</p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
            <MarkAsRead className="w-4 h-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

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
              <option value="ANNOUNCEMENT">Announcements</option>
              <option value="URGENT">Urgent</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="REMINDER">Reminders</option>
              <option value="SYSTEM_ALERT">System Alerts</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>All ({notifications.length})</span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center space-x-2">
            <BellRing className="w-4 h-4" />
            <span>Unread ({unreadCount})</span>
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Read ({notifications.length - unreadCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          <NotificationsList 
            notifications={filteredNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={handleMarkAsRead}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface NotificationsListProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationIds: string[]) => void;
  loading: boolean;
}

const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  loading
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'URGENT':
        return <BellRing className="w-4 h-4 text-red-500" />;
      case 'MAINTENANCE':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'REMINDER':
        return <Calendar className="w-4 h-4 text-yellow-500" />;
      case 'SYSTEM_ALERT':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
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

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE \'at\' HH:mm');
    } else {
      return format(date, 'MMM dd, yyyy \'at\' HH:mm');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
        <p className="text-gray-600">You're all caught up! Check back later for new updates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
                <Card
                  key={notification.id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                    }`}
          onClick={() => onNotificationClick(notification)}
                >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                {getTypeIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h3>
                  <Badge className={getTypeColor(notification.type)}>
                    {notification.type}
                              </Badge>
                            {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                
                <p className={`text-sm ${!notification.isRead ? 'text-gray-700' : 'text-gray-600'}`}>
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatNotificationDate(notification.createdAt)}</span>
                    {notification.tags.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Tag className="w-3 h-3" />
                        {notification.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
          )}
        </div>

                  <div className="flex items-center space-x-2">
                    {notification.actionUrl && (
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    )}
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead([notification.id]);
                        }}
                        className="text-xs"
                      >
                        Mark as read
                      </Button>
                    )}
                </div>
                </div>
                </div>
              </div>
            </CardContent>
          </Card>
      ))}
    </div>
  );
};

export default Notifications;