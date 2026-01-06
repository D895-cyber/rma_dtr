import api from './api';

export interface NotificationPreference {
  id: string;
  userId: string;
  emailCaseAssigned: boolean;
  emailStatusChanged: boolean;
  emailOverdueAlert: boolean;
  emailEscalation: boolean;
  emailCommentAdded: boolean;
  inAppCaseAssigned: boolean;
  inAppStatusChanged: boolean;
  inAppOverdueAlert: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationPreferenceService = {
  async getPreferences(): Promise<{ success: boolean; data: { preferences: NotificationPreference } }> {
    return await api.get('/notification-preferences');
  },

  async updatePreferences(data: Partial<NotificationPreference>): Promise<{ success: boolean; data: { preferences: NotificationPreference } }> {
    return await api.put('/notification-preferences', data);
  },
};

