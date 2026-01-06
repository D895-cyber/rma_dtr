import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get notification preferences for current user
export async function getNotificationPreferences(req: AuthRequest, res: Response) {
  try {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: req.user!.userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user!.userId,
        },
      });
    }

    return sendSuccess(res, { preferences });
  } catch (error: any) {
    console.error('Get notification preferences error:', error);
    return sendError(res, 'Failed to fetch notification preferences', 500, error.message);
  }
}

// Update notification preferences
export async function updateNotificationPreferences(req: AuthRequest, res: Response) {
  try {
    const {
      emailCaseAssigned,
      emailStatusChanged,
      emailOverdueAlert,
      emailEscalation,
      emailCommentAdded,
      inAppCaseAssigned,
      inAppStatusChanged,
      inAppOverdueAlert,
    } = req.body;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.userId },
      update: {
        emailCaseAssigned,
        emailStatusChanged,
        emailOverdueAlert,
        emailEscalation,
        emailCommentAdded,
        inAppCaseAssigned,
        inAppStatusChanged,
        inAppOverdueAlert,
      },
      create: {
        userId: req.user!.userId,
        emailCaseAssigned: emailCaseAssigned ?? true,
        emailStatusChanged: emailStatusChanged ?? true,
        emailOverdueAlert: emailOverdueAlert ?? true,
        emailEscalation: emailEscalation ?? true,
        emailCommentAdded: emailCommentAdded ?? false,
        inAppCaseAssigned: inAppCaseAssigned ?? true,
        inAppStatusChanged: inAppStatusChanged ?? true,
        inAppOverdueAlert: inAppOverdueAlert ?? true,
      },
    });

    return sendSuccess(res, { preferences }, 'Notification preferences updated successfully');
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return sendError(res, 'Failed to update notification preferences', 500, error.message);
  }
}

// Helper function to get preferences (used by other controllers)
export async function getNotificationPreferencesForUser(userId: string) {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  return preferences || {
    emailCaseAssigned: true,
    emailStatusChanged: true,
    emailOverdueAlert: true,
    emailEscalation: true,
    emailCommentAdded: false,
    inAppCaseAssigned: true,
    inAppStatusChanged: true,
    inAppOverdueAlert: true,
  };
}

