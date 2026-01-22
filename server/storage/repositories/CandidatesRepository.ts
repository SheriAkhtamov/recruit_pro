/**
 * CandidatesRepository  - завершенная миграция из storage.ts
 * С исправлениями безопасности: workspaceId проверка, soft delete, транзакции
 */

import { db } from '../../db';
import { candidates, interviewStages, interviews, users } from '@shared/schema';
import type { Candidate, InsertCandidate } from '@shared/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';

export class CandidatesRepository {
  /**
   * Get all candidates (excluding soft-deleted)
   */
  async getCandidates(workspaceId?: number): Promise<Candidate[]> {
    const interviewCount = sql<number>`(
      SELECT COUNT(*)
      FROM ${interviews}
      WHERE ${interviews.candidateId} = ${candidates.id}
    )`.as('interviewCount');
    const baseQuery = db
      .select({
        id: candidates.id,
        workspaceId: candidates.workspaceId,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        dismissalReason: candidates.dismissalReason,
        dismissalDate: candidates.dismissalDate,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        deletedAt: candidates.deletedAt,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        interviewCount,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.createdBy, users.id));

    if (workspaceId) {
      const results = await baseQuery
        .where(and(eq(candidates.workspaceId, workspaceId), isNull(candidates.deletedAt)))
        .orderBy(desc(candidates.createdAt));
      return results.map(({ interviewCount: _count, ...candidate }) => candidate);
    }

    const results = await baseQuery
      .where(isNull(candidates.deletedAt))
      .orderBy(desc(candidates.createdAt));
    return results.map(({ interviewCount: _count, ...candidate }) => candidate);
  }

  /**
   * Get active candidates  only (status = 'active' and not deleted)
   */
  async getActiveCandidates(workspaceId?: number): Promise<Candidate[]> {
    const baseQuery = db
      .select({
        id: candidates.id,
        workspaceId: candidates.workspaceId,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        city: candidates.city,
        vacancyId: candidates.vacancyId,
        resumeUrl: candidates.resumeUrl,
        resumeFilename: candidates.resumeFilename,
        photoUrl: candidates.photoUrl,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        status: candidates.status,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        dismissalReason: candidates.dismissalReason,
        dismissalDate: candidates.dismissalDate,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        deletedAt: candidates.deletedAt,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
        createdByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.createdBy, users.id));

    if (workspaceId) {
      return await baseQuery
        .where(
          and(
            eq(candidates.status, 'active'),
            eq(candidates.workspaceId, workspaceId),
            isNull(candidates.deletedAt)
          )
        )
        .orderBy(desc(candidates.createdAt));
    }

    return await baseQuery
      .where(and(eq(candidates.status, 'active'), isNull(candidates.deletedAt)))
      .orderBy(desc(candidates.createdAt));
  }

  /**
   * Get single candidate
   */
  async getCandidate(id: number, workspaceId?: number): Promise<Candidate | undefined> {
    const conditions = [eq(candidates.id, id), isNull(candidates.deletedAt)];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(and(...conditions));

    return candidate || undefined;
  }

  /**
   * Create candidate
   */
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    return await db.transaction(async (tx) => {
      const [newCandidate] = await tx.insert(candidates).values(candidate).returning();

      // If interview stage chain is provided, create interview stages
      if (candidate.interviewStageChain) {
        const stageChain = candidate.interviewStageChain as any[];
        for (let i = 0; i < stageChain.length; i++) {
          const stage = stageChain[i];
          await tx.insert(interviewStages).values({
            candidateId: newCandidate.id,
            stageIndex: i,
            stageName: stage.stageName,
            interviewerId: stage.interviewerId,
            status: i === 0 ? 'pending' : 'waiting',
          });
        }
      }

      return newCandidate;
    });
  }

  /**
   * Update candidate
   */
  async updateCandidate(id: number, candidate: Partial<InsertCandidate>, workspaceId?: number): Promise<Candidate> {
    const conditions = [eq(candidates.id, id)];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [updatedCandidate] = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    return updatedCandidate;
  }

  /**
   * Delete candidate (soft delete)
   * FIXED: Added workspaceId check for security, using soft delete to preserve history
   */
  async deleteCandidate(id: number, workspaceId: number): Promise<void> {
    // Use soft delete instead of hard delete
    await db
      .update(candidates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(candidates.id, id), eq(candidates.workspaceId, workspaceId), isNull(candidates.deletedAt)));
  }

  /**
   * Get candidates by vacancy
   */
  async getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(and(eq(candidates.vacancyId, vacancyId), isNull(candidates.deletedAt)))
      .orderBy(desc(candidates.createdAt));
  }

  /**
   * Get candidates by status
   */
  async getCandidatesByStatus(status: string, workspaceId?: number): Promise<Candidate[]> {
    const conditions = [eq(candidates.status, status), isNull(candidates.deletedAt)];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }
}

export const candidatesRepository = new CandidatesRepository();
