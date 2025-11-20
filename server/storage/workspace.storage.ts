import { db } from '../db';
import { workspaces, type Workspace, type InsertWorkspace } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WorkspaceStorage {
    async getWorkspaces(): Promise<Workspace[]> {
        return db.select().from(workspaces);
    }

    async getWorkspace(id: number): Promise<Workspace | undefined> {
        const result = await db.select().from(workspaces).where(eq(workspaces.id, id));
        return result[0];
    }

    async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
        const result = await db.insert(workspaces).values(workspace).returning();
        return result[0];
    }

    async updateWorkspace(id: number, workspace: Partial<InsertWorkspace>): Promise<Workspace> {
        const result = await db
            .update(workspaces)
            .set(workspace)
            .where(eq(workspaces.id, id))
            .returning();
        return result[0];
    }

    async deleteWorkspace(id: number): Promise<void> {
        await db.delete(workspaces).where(eq(workspaces.id, id));
    }
}

export const workspaceStorage = new WorkspaceStorage();
