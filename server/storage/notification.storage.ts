import { db } from '../db';
import { notifications, type Notification, type InsertNotification } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export class NotificationStorage {
    async getNotificationsByUser(userId: number): Promise<Notification[]> {
        return db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt));
    }

    async createNotification(notification: InsertNotification): Promise<Notification> {
        const result = await db.insert(notifications).values(notification).returning();
        return result[0];
    }

    async markNotificationAsRead(id: number): Promise<Notification> {
        const result = await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id))
            .returning();
        return result[0];
    }

    async markAllNotificationsAsRead(userId: number): Promise<void> {
        await db
            .update(notifications)
            .set({ isRead: true })
            .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    }

    async deleteNotification(id: number): Promise<void> {
        await db.delete(notifications).where(eq(notifications.id, id));
    }
}

export const notificationStorage = new NotificationStorage();
