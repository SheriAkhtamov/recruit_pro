import { db } from '../db';
import { superAdmins, type SuperAdmin, type InsertSuperAdmin } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class SuperAdminStorage {
    async getSuperAdminByUsername(username: string): Promise<SuperAdmin | undefined> {
        const result = await db
            .select()
            .from(superAdmins)
            .where(eq(superAdmins.username, username));
        return result[0];
    }

    async getSuperAdmin(id: number): Promise<SuperAdmin | undefined> {
        const result = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
        return result[0];
    }

    async createSuperAdmin(superAdmin: InsertSuperAdmin): Promise<SuperAdmin> {
        const result = await db.insert(superAdmins).values(superAdmin).returning();
        return result[0];
    }

    async updateSuperAdmin(id: number, superAdmin: Partial<InsertSuperAdmin>): Promise<SuperAdmin> {
        const result = await db
            .update(superAdmins)
            .set(superAdmin)
            .where(eq(superAdmins.id, id))
            .returning();
        return result[0];
    }

    async deleteSuperAdmin(id: number): Promise<void> {
        await db.delete(superAdmins).where(eq(superAdmins.id, id));
    }
}

export const superAdminStorage = new SuperAdminStorage();
