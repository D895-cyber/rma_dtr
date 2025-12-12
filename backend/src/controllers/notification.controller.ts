import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../utils/prisma.util';

// Get user's notifications
export async function getUserNotifications(req: AuthRequest, res: Response) {
  try {
    const { read, page = '1', limit = '20' } = req.query;
    const userId = req.user!.userId;

    const where: any = { userId };

    if (read !== undefined) {
      where.read = read === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    return sendSuccess(res, { notifications, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return sendError(res, 'Failed to fetch notifications', 500, error.message);
  }
}

// Get unread notification count
export async function getUnreadCount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return sendSuccess(res, { count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return sendError(res, 'Failed to fetch unread count', 500, error.message);
  }
}

// Mark notification as read
export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return sendSuccess(res, { notification: updatedNotification }, 'Notification marked as read');
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return sendError(res, 'Failed to mark as read', 500, error.message);
  }
}

// Mark all notifications as read
export async function markAllAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });

    return sendSuccess(res, { count: result.count }, 'All notifications marked as read');
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    return sendError(res, 'Failed to mark all as read', 500, error.message);
  }
}

// Delete notification
export async function deleteNotification(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }

    await prisma.notification.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Notification deleted successfully');
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return sendError(res, 'Failed to delete notification', 500, error.message);
  }
}

// Delete all read notifications
export async function deleteAllRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        read: true,
      },
    });

    return sendSuccess(res, { count: result.count }, 'Read notifications deleted');
  } catch (error: any) {
    console.error('Delete all read error:', error);
    return sendError(res, 'Failed to delete read notifications', 500, error.message);
  }
}



