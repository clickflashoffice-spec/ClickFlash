import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  category: 'system' | 'order' | 'sync' | 'user';
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'order'>('all');

  useEffect(() => {
    // Simulate loading notifications
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Cloud Sync Completed',
        message: 'Successfully synced 245 photos to cloud storage',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
        category: 'sync'
      },
      {
        id: '2',
        title: 'New Order Received',
        message: 'Order #ORD-00123 received from customer',
        type: 'info',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false,
        category: 'order'
      },
      {
        id: '3',
        title: 'System Maintenance',
        message: 'Scheduled maintenance in 2 hours',
        type: 'warning',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
        category: 'system'
      },
      {
        id: '4',
        title: 'Storage Warning',
        message: 'Cloud storage is 85% full',
        type: 'warning',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
        category: 'system'
      },
      {
        id: '5',
        title: 'New User Registered',
        message: 'Photographer John Doe joined the team',
        type: 'info',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        category: 'user'
      }
    ];

    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.category === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Mark all read</span>
            </button>
          )}
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Clear all</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'system', label: 'System', count: notifications.filter(n => n.category === 'system').length },
          { key: 'order', label: 'Orders', count: notifications.filter(n => n.category === 'order').length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-cyan-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              filter === tab.key ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                notification.read 
                  ? 'bg-white border-slate-200' 
                  : getTypeColor(notification.type)
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-semibold ${notification.read ? 'text-slate-900' : 'text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    <p className={`text-sm mt-1 ${notification.read ? 'text-slate-500' : 'text-slate-700'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.timestamp).toLocaleString()}
                      <span className="px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                        {notification.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
