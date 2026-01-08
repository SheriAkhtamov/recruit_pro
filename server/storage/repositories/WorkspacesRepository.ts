import { db } from "../../db";
import { workspaces, type Workspace, type InsertWorkspace } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class WorkspacesRepository {
  private ensureDb() {
    if (!db) {
      throw new Error("Database not initialized");
    }
  }

  async getWorkspaces(): Promise<Workspace[]> {
    this.ensureDb();
    return await db
      .select()
      .from(workspaces)
      .orderBy(desc(workspaces.createdAt));
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    this.ensureDb();
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));
    return workspace;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    this.ensureDb();
    const [createdWorkspace] = await db
      .insert(workspaces)
      .values({
        ...workspace,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return createdWorkspace;
  }

  async updateWorkspace(id: number, workspace: Partial<InsertWorkspace>): Promise<Workspace> {
    this.ensureDb();
    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        ...workspace,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, id))
      .returning();
    
    if (!updatedWorkspace) {
      throw new Error("Workspace not found");
    }
    
    return updatedWorkspace;
  }

  async deleteWorkspace(id: number): Promise<void> {
    this.ensureDb();
    const result = await db
      .delete(workspaces)
      .where(eq(workspaces.id, id));
    
    // Note: Due to cascade deletes, this will also delete all related data
    // (users, vacancies, candidates, interviews, etc.)
    if (result.rowCount === 0) {
      throw new Error("Workspace not found");
    }
  }
}
