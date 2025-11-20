import { db } from "../../db";
import { 
  candidates, 
  interviewStages, 
  documentationAttachments,
  type Candidate, 
  type InsertCandidate 
} from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";

export class CandidatesRepository {
  private ensureDb() {
    if (!db) {
      throw new Error("Database not initialized");
    }
  }

  async getCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
    
    if (workspaceId !== undefined) {
      return await db
        .select()
        .from(candidates)
        .where(eq(candidates.workspaceId, workspaceId))
        .orderBy(desc(candidates.createdAt));
    }
    
    return await db
      .select()
      .from(candidates)
      .orderBy(desc(candidates.createdAt));
  }

  async getActiveCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
    const conditions = [eq(candidates.status, "active")];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number, workspaceId?: number): Promise<Candidate | undefined> {
    this.ensureDb();
    const conditions = [eq(candidates.id, id)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(and(...conditions));
    
    return candidate;
  }

  async getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]> {
    this.ensureDb();
    return await db
      .select()
      .from(candidates)
      .where(eq(candidates.vacancyId, vacancyId))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByInterviewer(interviewerId: number, workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
    const conditions = [eq(interviewStages.interviewerId, interviewerId)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
      .select({
        id: candidates.id,
        workspaceId: candidates.workspaceId,
        vacancyId: candidates.vacancyId,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        dateOfBirth: candidates.dateOfBirth,
        city: candidates.city,
        photoUrl: candidates.photoUrl,
        resumeUrl: candidates.resumeUrl,
        status: candidates.status,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        dismissalReason: candidates.dismissalReason,
        dismissalDate: candidates.dismissalDate,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .innerJoin(interviewStages, eq(candidates.id, interviewStages.candidateId))
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByStatus(status: string, workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
    const conditions = [eq(candidates.status, status)];
    
    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    this.ensureDb();
    const [createdCandidate] = await db
      .insert(candidates)
      .values({
        ...candidate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return createdCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    this.ensureDb();
    const [updatedCandidate] = await db
      .update(candidates)
      .set({
        ...candidate,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, id))
      .returning();
    
    if (!updatedCandidate) {
      throw new Error("Candidate not found");
    }
    
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<void> {
    this.ensureDb();
    
    // Delete interview stages first
    await db.delete(interviewStages).where(eq(interviewStages.candidateId, id));
    
    // Delete documentation attachments
    await db.delete(documentationAttachments).where(eq(documentationAttachments.candidateId, id));
    
    // Delete the candidate
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async dismissCandidate(id: number, dismissalReason: string, dismissalDate: Date, workspaceId?: number): Promise<Candidate> {
    this.ensureDb();
    const conditions: Array<ReturnType<typeof eq>> = [eq(candidates.id, id)];
    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [updatedCandidate] = await db
      .update(candidates)
      .set({
        status: 'dismissed',
        dismissalReason,
        dismissalDate,
        updatedAt: new Date()
      })
      .where(and(...conditions))
      .returning();
    
    if (!updatedCandidate) {
      throw new Error("Candidate not found");
    }
    
    return updatedCandidate;
  }

  async getArchivedCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
    const conditions = [
      or(
        eq(candidates.status, 'hired'),
        eq(candidates.status, 'rejected'),
        eq(candidates.status, 'dismissed')
      )
    ];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
      .select({
        id: candidates.id,
        workspaceId: candidates.workspaceId,
        vacancyId: candidates.vacancyId,
        fullName: candidates.fullName,
        email: candidates.email,
        phone: candidates.phone,
        dateOfBirth: candidates.dateOfBirth,
        city: candidates.city,
        photoUrl: candidates.photoUrl,
        resumeUrl: candidates.resumeUrl,
        status: candidates.status,
        source: candidates.source,
        interviewStageChain: candidates.interviewStageChain,
        currentStageIndex: candidates.currentStageIndex,
        rejectionReason: candidates.rejectionReason,
        rejectionStage: candidates.rejectionStage,
        dismissalReason: candidates.dismissalReason,
        dismissalDate: candidates.dismissalDate,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.updatedAt));
  }
}
