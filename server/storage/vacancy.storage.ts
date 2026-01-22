import { db } from '../db';
import { vacancies, type Vacancy, type InsertVacancy } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class VacancyStorage {
    async getVacancies(workspaceId?: number): Promise<Vacancy[]> {
        if (workspaceId) {
            return db.select().from(vacancies).where(eq(vacancies.workspaceId, workspaceId));
        }
        return db.select().from(vacancies);
    }

    async getVacancy(id: number, workspaceId?: number): Promise<Vacancy | undefined> {
        const conditions = workspaceId
            ? and(eq(vacancies.id, id), eq(vacancies.workspaceId, workspaceId))
            : eq(vacancies.id, id);

        const result = await db.select().from(vacancies).where(conditions!);
        return result[0];
    }

    async createVacancy(vacancy: InsertVacancy): Promise<Vacancy> {
        const result = await db.insert(vacancies).values(vacancy).returning();
        return result[0];
    }

    async updateVacancy(id: number, vacancy: Partial<InsertVacancy>, workspaceId?: number): Promise<Vacancy> {
        const conditions = [eq(vacancies.id, id)];
        if (workspaceId) {
            conditions.push(eq(vacancies.workspaceId, workspaceId));
        }
        const result = await db
            .update(vacancies)
            .set({ ...vacancy, updatedAt: new Date() })
            .where(and(...conditions))
            .returning();
        return result[0];
    }

    async deleteVacancy(id: number): Promise<void> {
        await db.delete(vacancies).where(eq(vacancies.id, id));
    }

    async getActiveVacancies(workspaceId?: number): Promise<Vacancy[]> {
        const conditions = workspaceId
            ? and(eq(vacancies.status, 'active'), eq(vacancies.workspaceId, workspaceId))
            : eq(vacancies.status, 'active');

        return db.select().from(vacancies).where(conditions!);
    }
}

export const vacancyStorage = new VacancyStorage();
