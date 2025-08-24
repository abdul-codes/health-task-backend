import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";

/**
 * Get all notifications for the logged-in user
 * GET /api/notifications
 */
export const getNotifications = asyncMiddleware(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  console.log("Fetching notifications for user:", userId);

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  console.log("Found", notifications.length, "notifications");

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
    return res.status(404).json({ message: "Notification not found" });
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
