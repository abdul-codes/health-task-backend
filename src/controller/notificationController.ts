import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import { AppError } from "../utils/AppError";

/**
 * Get all notifications for logged-in user
 * GET /api/notifications
 */
export const getNotifications = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    ...( {cacheStrategy: {
      swr: 60,
      ttl: 30,
    } }as any)
  });

  res.json(notifications);
});

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'notificationController');
  }

  const updatedNotification = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  res.json(updatedNotification);
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read/all
 */
export const markAllAsRead = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  res.json({ message: "All notifications marked as read" });
});
