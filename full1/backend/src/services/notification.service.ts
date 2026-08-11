import { prisma } from '../config/db';
import { ApiError } from '../utils/ApiError';
import { buildPaginationMeta } from '../utils/ApiResponse';
import type { NotificationType } from '@prisma/client';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

function toDTO(notification: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

export const notificationService = {
  /** Fire-and-forget in-app notification (never throws into the caller flow). */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    link: string | null = null,
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: { userId, type, title, body, link },
      });
    } catch (err) {
      console.error(`[notifications] failed to create ${type} for user ${userId}: ${err instanceof Error ? err.message : err}`);
    }
  },

  /** Creates one notification for every user (admin announcements). */
  async createForAll(
    type: NotificationType,
    title: string,
    body: string,
    link: string | null = null,
    batchSize = 200,
  ): Promise<number> {
    let created = 0;
    try {
      const userIds = await prisma.user.findMany({ select: { id: true } });
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await prisma.notification.createMany({
          data: batch.map((user) => ({ userId: user.id, type, title, body, link })),
        });
        created += batch.length;
      }
    } catch (err) {
      console.error(`[notifications] announcement broadcast failed: ${err instanceof Error ? err.message : err}`);
    }
    return created;
  },

  async listForUser(
    userId: string,
    query: { page?: string; limit?: string },
  ): Promise<{ items: NotificationDTO[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const page = Math.max(1, Math.floor(Number(query.page ?? 1)));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(query.limit ?? 20))));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: rows.map(toDTO),
      meta: buildPaginationMeta(page, limit, total),
    };
  },

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  },

  async markRead(userId: string, id: string): Promise<NotificationDTO> {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw ApiError.notFound('Notification not found');
    if (notification.userId !== userId) throw ApiError.forbidden('You cannot modify another user\u2019s notification');

    const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
    return toDTO(updated);
  },

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  },
};
