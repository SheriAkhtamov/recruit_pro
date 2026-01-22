import { db } from "../../db";
import { vacancies, candidates, type Vacancy, type InsertVacancy } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class VacanciesRepository {
  private ensureDb() {
    if (!db) {
      throw new Error("Database not initialized");
    }
  }

  async getVacancies(workspaceId?: number): Promise<Vacancy[]> {
    this.ensureDb();
    
    if (workspaceId !== undefined) {
      return await db
        .select()
        .from(vacancies)
        .where(eq(vacancies.workspaceId, workspaceId))
        .orderBy(desc(vacancies.createdAt));
    }
    
    return await db
      .select()
      .from(vacancies)
      .orderBy(desc(vacancies.createdAt));
  }

  async getVacancy(id: number, workspaceId?: number): Promise<Vacancy | undefined> {
    this.ensureDb();
    const conditions = [eq(vacancies.id, id)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(vacancies.workspaceId, workspaceId));
    }

    const [vacancy] = await db
      .select()
      .from(vacancies)
      .where(and(...conditions));
    
    return vacancy;
  }

  async createVacancy(vacancy: InsertVacancy): Promise<Vacancy> {
    this.ensureDb();
    const [createdVacancy] = await db
      .insert(vacancies)
      .values({
        ...vacancy,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return createdVacancy;
  }

  async updateVacancy(id: number, vacancy: Partial<InsertVacancy>, workspaceId?: number): Promise<Vacancy> {
    this.ensureDb();
    const conditions = [eq(vacancies.id, id)];
    if (workspaceId !== undefined) {
      conditions.push(eq(vacancies.workspaceId, workspaceId));
    }
    const [updatedVacancy] = await db
      .update(vacancies)
      .set({
        ...vacancy,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();
    
    if (!updatedVacancy) {
      throw new Error("Vacancy not found");
    }
    
    return updatedVacancy;
  }

  async deleteVacancy(id: number): Promise<void> {
    this.ensureDb();
    
    // First, delete all candidates associated with this vacancy
    const associatedCandidates = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.vacancyId, id));

    for (const candidate of associatedCandidates) {
      await db.delete(candidates).where(eq(candidates.id, candidate.id));
    }

    // Now delete the vacancy
    await db.delete(vacancies).where(eq(vacancies.id, id));
  }

  async getActiveVacancies(workspaceId?: number): Promise<Vacancy[]> {
    this.ensureDb();
    const conditions: Array<ReturnType<typeof eq>> = [eq(vacancies.status, "active")];

    if (workspaceId) {
      conditions.push(eq(vacancies.workspaceId, workspaceId));
    }

    return await db
      .select()
      .from(vacancies)
      .where(and(...conditions))
      .orderBy(desc(vacancies.createdAt));
  }
}
