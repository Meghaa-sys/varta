import { prisma } from "../../config/prisma";

export const listNotifications = async (userId: string) =>
  prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100
  });

export const markNotificationRead = async (userId: string, notificationId: string) =>
  prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId
    },
    data: { isRead: true }
  });

export const markAllNotificationsRead = async (userId: string) =>
  prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: { isRead: true }
  });
