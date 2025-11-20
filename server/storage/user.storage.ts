import { db } from '../db';
import {
    users,
    type User,
    type InsertUser,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class UserStorage {
    async getUser(id: number, workspaceId?: number): Promise<User | undefined> {
        const conditions = workspaceId
            ? and(eq(users.id, id), eq(users.workspaceId, workspaceId))
            : eq(users.id, id);

        const result = await db.select().from(users).where(conditions!);
        return result[0];
    }

    async getUserByEmail(email: string, workspaceId?: number): Promise<User | undefined> {
        const conditions = workspaceId
            ? and(eq(users.email, email), eq(users.workspaceId, workspaceId))
            : eq(users.email, email);

        const result = await db.select().from(users).where(conditions!);
        return result[0];
    }

    async getUsers(workspaceId?: number): Promise<User[]> {
        if (workspaceId) {
            return db.select().from(users).where(eq(users.workspaceId, workspaceId));
        }
        return db.select().from(users);
    }

    async getUserWithPassword(id: number, workspaceId?: number): Promise<User | undefined> {
        return this.getUser(id, workspaceId);
    }

    async getWorkspaceAdminUser(workspaceId: number): Promise<User | undefined> {
        const result = await db
            .select()
            .from(users)
            .where(and(eq(users.workspaceId, workspaceId), eq(users.role, 'admin')))
            .limit(1);
        return result[0];
    }

    async createUser(user: InsertUser): Promise<User> {
        const result = await db.insert(users).values(user).returning();
        return result[0];
    }

    async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
        const result = await db
            .update(users)
            .set({ ...user, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
        return result[0];
    }

    async deleteUser(id: number): Promise<void> {
        await db.delete(users).where(eq(users.id, id));
    }

    async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
        await db
            .update(users)
            .set({ isOnline })
            .where(eq(users.id, userId));
    }

    async getUsersWithOnlineStatus(workspaceId?: number): Promise<User[]> {
        return this.getUsers(workspaceId);
    }
}

export const userStorage = new UserStorage();
