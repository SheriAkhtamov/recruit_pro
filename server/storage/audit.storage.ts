import { db } from '../db';
import { auditLogs, type AuditLog, type InsertAuditLog } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class AuditStorage {
    async getAuditLogs(workspaceId?: number): Promise<AuditLog[]> {
        const query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

        if (workspaceId) {
            // Filter by workspace if needed (requires join with users table)
            return query;
        }

        return query;
    }

    async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
        const result = await db.insert(auditLogs).values(auditLog).returning();
        return result[0];
    }

    async getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
        return db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.entityType, entityType))
            .orderBy(desc(auditLogs.createdAt));
    }

    async deleteAuditLog(id: number): Promise<void> {
        await db.delete(auditLogs).where(eq(auditLogs.id, id));
    }
}

export const auditStorage = new AuditStorage();
