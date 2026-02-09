import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, FileText, Package, AlertCircle, Info } from 'lucide-react';
import { useNotificationsAPI, Notification } from '../hooks/useAPI';

interface NotificationsProps {
  currentUser: any;
  onNavigate?: (caseType: 'DTR' | 'RMA', caseId: string) => void;
}

export function Notifications({ currentUser, onNavigate }: NotificationsProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotificationsAPI();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'status-change':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'escalation':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (onNavigate) {
      onNavigate(notification.caseType, notification.caseId);
    }
    setShowDropdown(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 sm:p-2.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-700" />
              <h3 className="text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No notifications</p>
                <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${notification.read ? 'text-gray-900' : 'text-gray-900 font-medium'}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">{formatTimestamp(notification.timestamp)}</span>
                          {notification.caseType === 'DTR' ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              DTR #{notification.caseId.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              RMA #{notification.caseId.slice(-6)}
                            </span>
                          )}
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button
                onClick={() => setShowDropdown(false)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

