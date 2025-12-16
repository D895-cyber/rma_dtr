// Notifications API Service

import api from './api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'assignment' | 'status_change' | 'warning';
  caseId?: string;
  caseType?: 'DTR' | 'RMA';
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  // Get all notifications for current user
  async getNotifications() {
    return await api.get<{ notifications: Notification[]; total: number }>('/notifications');
  },

  // Get unread count
  async getUnreadCount() {
    return await api.get<{ count: number }>('/notifications/unread-count');
  },

  // Mark notification as read
  async markAsRead(id: string) {
    return await api.put(`/notifications/${id}/read`);
  },

  // Mark all as read
  async markAllAsRead() {
    return await api.put('/notifications/mark-all-read');
  },

  // Delete notification
  async deleteNotification(id: string) {
    return await api.delete(`/notifications/${id}`);
  },
};

export default notificationService;




