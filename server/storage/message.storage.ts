import { db } from '../db';
import { messages, users, type Message, type InsertMessage } from '@shared/schema';
import { eq, or, and, desc, sql } from 'drizzle-orm';

export class MessageStorage {
    async getConversations(userId: number, workspaceId?: number): Promise<any[]> {
        // Get unique conversations for the user
        const query = sql`
      SELECT DISTINCT 
        CASE 
          WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId}
          ELSE ${messages.senderId}
        END as partner_id,
        MAX(${messages.createdAt}) as last_message_time
      FROM ${messages}
      WHERE ${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}
      GROUP BY partner_id
      ORDER BY last_message_time DESC
    `;

        return db.execute(query) as Promise<any[]>;
    }

    async getMessagesBetweenUsers(senderId: number, receiverId: number, workspaceId?: number): Promise<Message[]> {
        return db
            .select()
            .from(messages)
            .where(
                or(
                    and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)),
                    and(eq(messages.senderId, receiverId), eq(messages.receiverId, senderId))
                )
            )
            .orderBy(messages.createdAt);
    }

    async createMessage(message: InsertMessage): Promise<Message> {
        const result = await db.insert(messages).values(message).returning();
        return result[0];
    }

    async updateMessage(id: number, updates: Partial<InsertMessage>): Promise<Message> {
        const result = await db
            .update(messages)
            .set(updates)
            .where(eq(messages.id, id))
            .returning();
        return result[0];
    }

    async deleteMessage(id: number): Promise<void> {
        await db.delete(messages).where(eq(messages.id, id));
    }

    async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
        await db
            .update(messages)
            .set({ isRead: true })
            .where(
                and(
                    eq(messages.senderId, senderId),
                    eq(messages.receiverId, receiverId),
                    eq(messages.isRead, false)
                )
            );
    }
}

export const messageStorage = new MessageStorage();
