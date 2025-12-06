import { db } from "../../db";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export class UsersRepository {
  private ensureDb() {
    if (!db) {
      throw new Error("Database not initialized");
    }
  }

  async getUser(id: number, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    const conditions = [eq(users.id, id)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(users.workspaceId, workspaceId));
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(...conditions));
    
    return user;
  }

  async getUserByEmail(email: string, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    const conditions = [eq(users.email, email)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(users.workspaceId, workspaceId));
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(...conditions));
    
    return user;
  }

  async getUsers(workspaceId?: number): Promise<User[]> {
    this.ensureDb();
    
    if (workspaceId !== undefined) {
      return await db
        .select()
        .from(users)
        .where(eq(users.workspaceId, workspaceId))
        .orderBy(asc(users.fullName));
    }
    
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.fullName));
  }

  async getUserWithPassword(id: number, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    const conditions = [eq(users.id, id)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(users.workspaceId, workspaceId));
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(...conditions));
    
    return user;
  }

  async getWorkspaceAdminUser(workspaceId: number): Promise<User | undefined> {
    this.ensureDb();
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.workspaceId, workspaceId),
        eq(users.role, "admin")
      ))
      .limit(1);
    
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    this.ensureDb();
    const [createdUser] = await db
      .insert(users)
      .values({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return createdUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    this.ensureDb();
    const [updatedUser] = await db
      .update(users)
      .set({
        ...user,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.ensureDb();
    await db
      .delete(users)
      .where(eq(users.id, id));
  }

  async updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    this.ensureDb();
    await db
      .update(users)
      .set({
        isOnline,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUsersWithOnlineStatus(workspaceId?: number): Promise<User[]> {
    this.ensureDb();
    const conditions: Array<ReturnType<typeof eq>> = [eq(users.isActive, true)];

    if (workspaceId) {
      conditions.push(eq(users.workspaceId, workspaceId));
    }

    return await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.fullName));
  }
}
