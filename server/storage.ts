import {
  users, vacancies, candidates, interviewStages, interviews,
  notifications, auditLogs, systemSettings, messages, departments, documentationAttachments,
  workspaces, superAdmins,
  type User, type InsertUser, type Vacancy, type InsertVacancy,
  type Candidate, type InsertCandidate, type InterviewStage,
  type InsertInterviewStage, type Interview, type InsertInterview,
  type Notification, type InsertNotification, type AuditLog,
  type InsertAuditLog, type SystemSetting, type InsertSystemSetting,
  type Message, type InsertMessage, type Department, type InsertDepartment,
  type DocumentationAttachment, type InsertDocumentationAttachment,
  type Workspace, type InsertWorkspace, type SuperAdmin, type InsertSuperAdmin
} from "@shared/schema";
import { db } from './db';
import { logger } from './lib/logger';
import { t } from './lib/i18n';
import { eq, and, or, desc, asc, gte, lte, count, sql } from "drizzle-orm";

interface StageCountData {
  stageIndex: number;
  stageName: string;
  count: string | number;
}

export interface IStorage {
  // Workspaces
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: number): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: number, workspace: Partial<InsertWorkspace>): Promise<Workspace>;
  deleteWorkspace(id: number): Promise<void>;

  // Super Admins
  getSuperAdminByUsername(username: string): Promise<SuperAdmin | undefined>;
  getSuperAdmin(id: number): Promise<SuperAdmin | undefined>;
  createSuperAdmin(superAdmin: InsertSuperAdmin): Promise<SuperAdmin>;

  // Users (updated to filter by workspaceId)
  getUser(id: number, workspaceId?: number): Promise<User | undefined>;
  getUserByEmail(email: string, workspaceId?: number): Promise<User | undefined>;
  getUserByLoginOrEmail(loginOrEmail: string, workspaceId?: number): Promise<User | undefined>;
  getUsers(workspaceId?: number): Promise<User[]>;
  getUserWithPassword(id: number, workspaceId?: number): Promise<User | undefined>; // For admin access to see passwords
  getWorkspaceAdminUser(workspaceId: number): Promise<User | undefined>; // Get admin user for workspace
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  getUsersWithOnlineStatus(workspaceId?: number): Promise<User[]>;

  // Vacancies (filtered by workspaceId)
  getVacancies(workspaceId?: number): Promise<Vacancy[]>;
  getVacancy(id: number, workspaceId?: number): Promise<Vacancy | undefined>;
  createVacancy(vacancy: InsertVacancy): Promise<Vacancy>;
  updateVacancy(id: number, vacancy: Partial<InsertVacancy>): Promise<Vacancy>;
  deleteVacancy(id: number, workspaceId?: number): Promise<void>;
  getActiveVacancies(workspaceId?: number): Promise<Vacancy[]>;

  // Candidates (filtered by workspaceId)
  getCandidates(workspaceId?: number): Promise<Candidate[]>;
  getActiveCandidates(workspaceId?: number): Promise<Candidate[]>; // Only candidates with 'active' status
  getCandidate(id: number, workspaceId?: number): Promise<Candidate | undefined>;

  getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]>;
  getCandidatesByInterviewer(interviewerId: number, workspaceId?: number): Promise<Candidate[]>;
  getCandidatesByStatus(status: string, workspaceId?: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: number, workspaceId?: number): Promise<void>;
  dismissCandidate(id: number, dismissalReason: string, dismissalDate: Date, workspaceId?: number): Promise<Candidate>;

  // Interview Stages
  getInterviewStagesByCandidate(candidateId: number): Promise<any[]>;
  getInterviewStage(id: number): Promise<InterviewStage | undefined>;
  deleteInterviewStagesByCandidate(candidateId: number): Promise<void>;
  getAllInterviewStages(): Promise<any[]>;
  createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage>;
  updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>): Promise<InterviewStage>;

  // Interviews
  getInterviews(workspaceId?: number): Promise<any[]>;
  getInterviewsByInterviewer(interviewerId: number, workspaceId?: number): Promise<any[]>;
  getInterviewsByDateRange(start: Date, end: Date, workspaceId?: number): Promise<Interview[]>;
  getInterviewsByStage(stageId: number): Promise<Interview[]>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview>;
  updateInterviewOutcome(id: number, outcome: string, notes: string): Promise<Interview>;
  rescheduleInterview(id: number, newDateTime: Date): Promise<Interview>;
  scheduleInterview(stageId: number, interviewerId: number, scheduledAt: Date, duration: number): Promise<Interview>;

  // Notifications
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number, userId: number): Promise<void>;
  getNotification(id: number): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<void>;

  // Archive
  getArchivedCandidates(workspaceId?: number): Promise<Candidate[]>;
  getArchivedCandidatesWithAttachments(workspaceId?: number): Promise<any[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(workspaceId: number, limit?: number, offset?: number): Promise<{ logs: AuditLog[]; total: number }>;

  // System Settings
  getSystemSetting(key: string, workspaceId: number): Promise<SystemSetting | undefined>;
  getSystemSettings(workspaceId: number): Promise<SystemSetting[]>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;

  // Messages
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  getConversationsByUser(userId: number, workspaceId?: number): Promise<User[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Analytics (typed)
  getDashboardStats(workspaceId: number): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    todayInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }>;
  getConversionFunnel(workspaceId: number): Promise<{
    stages: { stageName: string; stageIndex: number; count: number }[];
    applications: number;
    hired: number;
  }>;
  getHiringTrends(workspaceId: number): Promise<any[]>;
  getDepartmentStats(workspaceId: number): Promise<any[]>;
  getTimeToHireStats(workspaceId: number): Promise<{
    averageDays: number;
    fastest: number;
    median: number;
    slowest: number;
  }>;
  getRejectionsByStage(workspaceId: number): Promise<{ stage: number; rejections: number; stageName: string }[]>;
  getDashboardStatsByMonth(workspaceId: number, month: string, year: string): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    monthlyInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }>;
  getConversionFunnelByMonth(workspaceId: number, month: string, year: string): Promise<{
    stages: { stageName: string; stageIndex: number; count: number }[];
    applications: number;
    hired: number;
  }>;
  getRejectionsByStageByMonth(workspaceId: number, month: string, year: string): Promise<{ stage: number; rejections: number; stageName: string }[]>;
  getAvailableDataPeriods(workspaceId: number): Promise<{ year: string; month: string; monthName: string }[]>;

  // Hired and dismissed analytics
  getHiredAndDismissedStats(workspaceId: number): Promise<{
    totalHired: number;
    totalDismissed: number;
    currentlyEmployed: number;
  }>;
  getHiredAndDismissedStatsByMonth(workspaceId: number): Promise<{
    month: string;
    monthName: string;
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]>;
  getHiredAndDismissedStatsByYear(workspaceId: number): Promise<{
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]>;

  // Departments
  getDepartments(workspaceId?: number): Promise<Department[]>;
  getDepartment(id: number, workspaceId?: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>, workspaceId?: number): Promise<Department>;
  deleteDepartment(id: number, workspaceId?: number): Promise<void>;
  markMessageAsRead(messageId: number, userId: number): Promise<Message>;

  // Documentation Attachments
  getDocumentationAttachments(candidateId: number): Promise<DocumentationAttachment[]>;
  getDocumentationAttachment(id: number): Promise<DocumentationAttachment | undefined>;
  createDocumentationAttachment(attachment: InsertDocumentationAttachment): Promise<DocumentationAttachment>;
  deleteDocumentationAttachment(id: number): Promise<void>;

  // Sync stages safely
  syncInterviewStages(candidateId: number, stages: (InsertInterviewStage & { id?: number })[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private ensureDb() {
    if (!db || typeof (db as any).select !== 'function') {
      const errorMessage = process.env.DATABASE_URL
        ? '💥 База данных недоступна. Проверьте подключение к PostgreSQL.'
        : '⚠️  База данных не настроена. Установите переменную окружения DATABASE_URL в .env';
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
  // Workspaces implementation
  async getWorkspaces(): Promise<Workspace[]> {
    this.ensureDb();
    return await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
  }

  async getWorkspace(id: number): Promise<Workspace | undefined> {
    this.ensureDb();
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    this.ensureDb();
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    return newWorkspace;
  }

  async updateWorkspace(id: number, workspace: Partial<InsertWorkspace>): Promise<Workspace> {
    this.ensureDb();
    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({ ...workspace, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return updatedWorkspace;
  }

  async deleteWorkspace(id: number): Promise<void> {
    this.ensureDb();
    // Cascade delete will handle all related data
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  // Super Admins implementation
  async getSuperAdminByUsername(username: string): Promise<SuperAdmin | undefined> {
    this.ensureDb();
    try {
      const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.username, username));
      return superAdmin || undefined;
    } catch (error: any) {
      logger.error(`[STORAGE] Error getting super admin:`, error.message);
      throw error;
    }
  }

  async getSuperAdmin(id: number): Promise<SuperAdmin | undefined> {
    this.ensureDb();
    const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return superAdmin || undefined;
  }

  async createSuperAdmin(superAdmin: InsertSuperAdmin): Promise<SuperAdmin> {
    this.ensureDb();
    const [newSuperAdmin] = await db.insert(superAdmins).values(superAdmin).returning();
    return newSuperAdmin;
  }

  async getUser(id: number, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    if (workspaceId) {
      const [user] = await db.select().from(users).where(
        and(eq(users.id, id), eq(users.workspaceId, workspaceId))
      );
      return user || undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    if (workspaceId) {
      const [user] = await db.select().from(users).where(
        and(eq(users.email, email), eq(users.workspaceId, workspaceId))
      );
      return user || undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByLoginOrEmail(loginOrEmail: string, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();
    const loginCondition = or(eq(users.email, loginOrEmail), eq(users.username, loginOrEmail));

    if (workspaceId) {
      const [user] = await db.select().from(users).where(
        and(loginCondition, eq(users.workspaceId, workspaceId))
      );
      return user || undefined;
    }

    const [user] = await db.select().from(users).where(loginCondition);
    return user || undefined;
  }

  async getUsers(workspaceId?: number): Promise<User[]> {
    this.ensureDb();
    if (workspaceId) {
      return await db.select().from(users)
        .where(eq(users.workspaceId, workspaceId))
        .orderBy(desc(users.createdAt));
    }
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserWithPassword(id: number, workspaceId?: number): Promise<User | undefined> {
    this.ensureDb();

    if (workspaceId) {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.workspaceId, workspaceId)));
      return user || undefined;
    }

    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getWorkspaceAdminUser(workspaceId: number): Promise<User | undefined> {
    this.ensureDb();
    const [user] = await db.select().from(users).where(
      and(eq(users.workspaceId, workspaceId), eq(users.role, 'admin'))
    ).orderBy(asc(users.id)).limit(1);
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    this.ensureDb();
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    this.ensureDb();
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.ensureDb();
    await db.delete(users).where(eq(users.id, id));
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

  async getVacancies(workspaceId?: number): Promise<Vacancy[]> {
    this.ensureDb();
    if (workspaceId) {
      return await db.select().from(vacancies)
        .where(eq(vacancies.workspaceId, workspaceId))
        .orderBy(desc(vacancies.createdAt));
    }
    return await db.select().from(vacancies).orderBy(desc(vacancies.createdAt));
  }

  async getVacancy(id: number, workspaceId?: number): Promise<Vacancy | undefined> {
    this.ensureDb();
    if (workspaceId) {
      const [vacancy] = await db.select().from(vacancies).where(
        and(eq(vacancies.id, id), eq(vacancies.workspaceId, workspaceId))
      );
      return vacancy || undefined;
    }
    const [vacancy] = await db.select().from(vacancies).where(eq(vacancies.id, id));
    return vacancy || undefined;
  }

  async createVacancy(vacancy: InsertVacancy): Promise<Vacancy> {
    this.ensureDb();
    const [newVacancy] = await db.insert(vacancies).values(vacancy).returning();
    return newVacancy;
  }

  async updateVacancy(id: number, vacancy: Partial<InsertVacancy>): Promise<Vacancy> {
    this.ensureDb();
    const [updatedVacancy] = await db
      .update(vacancies)
      .set({ ...vacancy, updatedAt: new Date() })
      .where(eq(vacancies.id, id))
      .returning();
    return updatedVacancy;
  }

  async deleteVacancy(id: number, workspaceId?: number): Promise<void> {
    this.ensureDb();
    // SECURITY FIX: Add workspaceId check
    // Soft delete candidates with CASCADE will handle interview stages/interviews
    const associatedCandidates = await db.select().from(candidates).where(eq(candidates.vacancyId, id));

    // Soft delete all associated candidates
    for (const candidate of associatedCandidates) {
      if (workspaceId) {
        await this.deleteCandidate(candidate.id, workspaceId);
      } else {
        await this.deleteCandidate(candidate.id);
      }
    }

    // Now delete the vacancy with workspaceId check
    const conditions = [eq(vacancies.id, id)];
    if (workspaceId) {
      conditions.push(eq(vacancies.workspaceId, workspaceId));
    }
    await db.delete(vacancies).where(and(...conditions));
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

  async getCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
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
        deletedAt: candidates.deletedAt,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
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
        .where(eq(candidates.workspaceId, workspaceId))
        .orderBy(desc(candidates.createdAt));
    }

    return await baseQuery.orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number, workspaceId?: number): Promise<Candidate | undefined> {
    this.ensureDb();
    if (workspaceId) {
      const [candidate] = await db.select().from(candidates).where(
        and(eq(candidates.id, id), eq(candidates.workspaceId, workspaceId))
      );
      return candidate || undefined;
    }
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  /**
   * Get only active candidates (excluding documentation, hired, rejected, archived, dismissed)
   * This is used in the main Candidates section to show only candidates in active recruitment
   */
  async getActiveCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
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
        deletedAt: candidates.deletedAt,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
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
        .where(and(eq(candidates.status, 'active'), eq(candidates.workspaceId, workspaceId)))
        .orderBy(desc(candidates.createdAt));
    }

    return await baseQuery
      .where(eq(candidates.status, 'active'))
      .orderBy(desc(candidates.createdAt));
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

    const conditions = [
      eq(interviewStages.interviewerId, interviewerId),
      eq(candidates.status, 'active'), // Only show active candidates
      or(
        eq(interviewStages.status, 'pending'),
        eq(interviewStages.status, 'in_progress')
      )
    ];

    if (workspaceId !== undefined) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await db
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
        deletedAt: candidates.deletedAt,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
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
      .innerJoin(interviewStages, eq(candidates.id, interviewStages.candidateId))
      .leftJoin(users, eq(candidates.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidatesByStatus(status: string, workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
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
        deletedAt: candidates.deletedAt,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
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
        .where(and(eq(candidates.status, status), eq(candidates.workspaceId, workspaceId)))
        .orderBy(desc(candidates.createdAt));
    }

    return await baseQuery
      .where(eq(candidates.status, status))
      .orderBy(desc(candidates.createdAt));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    this.ensureDb();
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();

    // If interview stage chain is provided, create interview stages
    if (candidate.interviewStageChain) {
      const stageChain = candidate.interviewStageChain as any[];
      for (let i = 0; i < stageChain.length; i++) {
        const stage = stageChain[i];
        await db.insert(interviewStages).values({
          candidateId: newCandidate.id,
          stageIndex: i,
          stageName: stage.stageName,
          interviewerId: stage.interviewerId,
          status: i === 0 ? 'pending' : 'waiting', // First stage is pending, others wait
        });
      }
    }

    return newCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    this.ensureDb();
    const [updatedCandidate] = await db
      .update(candidates)
      .set({ ...candidate, updatedAt: new Date() })
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: number, workspaceId?: number): Promise<void> {
    this.ensureDb();
    try {
      // SECURITY FIX: Use soft delete instead of hard delete to preserve history
      // Also add workspaceId check for security
      const conditions = [eq(candidates.id, id)];
      if (workspaceId) {
        conditions.push(eq(candidates.workspaceId, workspaceId));
      }

      await db
        .update(candidates)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(...conditions));
    } catch (error) {
      logger.error('Error soft-deleting candidate:', error);
      throw error;
    }
  }

  async deleteInterviewStagesByCandidate(candidateId: number): Promise<void> {
    this.ensureDb();
    try {
      // First, delete interviews that reference these stages
      await db.delete(interviews).where(eq(interviews.candidateId, candidateId));

      // Then delete interview stages
      await db.delete(interviewStages).where(eq(interviewStages.candidateId, candidateId));
    } catch (error) {
      logger.error('Error deleting interview stages for candidate:', error);
      throw error;
    }
  }

  async getInterviewStagesByCandidate(candidateId: number, workspaceId?: number): Promise<any[]> {
    this.ensureDb();
    let query = db
      .select({
        id: interviewStages.id,
        candidateId: interviewStages.candidateId,
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
        interviewerId: interviewStages.interviewerId,
        status: interviewStages.status,
        scheduledAt: interviewStages.scheduledAt,
        completedAt: interviewStages.completedAt,
        comments: interviewStages.comments,
        rating: interviewStages.rating,
        createdAt: interviewStages.createdAt,
        updatedAt: interviewStages.updatedAt,
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
        // Include interview ID for rescheduling
        interviewId: interviews.id,
      })
      .from(interviewStages)
      .leftJoin(users, eq(interviewStages.interviewerId, users.id))
      .leftJoin(interviews, eq(interviews.stageId, interviewStages.id));

    const conditions: any[] = [eq(interviewStages.candidateId, candidateId)];

    if (workspaceId) {
      query = query.leftJoin(candidates, eq(interviewStages.candidateId, candidates.id)) as any;
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await query
      .where(and(...conditions))
      .orderBy(asc(interviewStages.stageIndex));
  }

  async getAllInterviewStages(workspaceId?: number): Promise<any[]> {
    this.ensureDb();
    let query = db
      .select({
        id: interviewStages.id,
        candidateId: interviewStages.candidateId,
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
        interviewerId: interviewStages.interviewerId,
        status: interviewStages.status,
        scheduledAt: interviewStages.scheduledAt,
        completedAt: interviewStages.completedAt,
        comments: interviewStages.comments,
        rating: interviewStages.rating,
        createdAt: interviewStages.createdAt,
        updatedAt: interviewStages.updatedAt,
      })
      .from(interviewStages);

    if (workspaceId) {
      query = query
        .leftJoin(candidates, eq(interviewStages.candidateId, candidates.id))
        .where(eq(candidates.workspaceId, workspaceId)) as any;
    }

    return await query.orderBy(asc(interviewStages.candidateId), asc(interviewStages.stageIndex));
  }

  async createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage> {
    this.ensureDb();
    const [newStage] = await db.insert(interviewStages).values(stage).returning();
    return newStage;
  }

  async getInterviewStage(id: number, workspaceId?: number): Promise<InterviewStage | undefined> {
    this.ensureDb();
    let query = db
      .select({
        id: interviewStages.id,
        candidateId: interviewStages.candidateId,
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
        interviewerId: interviewStages.interviewerId,
        status: interviewStages.status,
        scheduledAt: interviewStages.scheduledAt,
        completedAt: interviewStages.completedAt,
        comments: interviewStages.comments,
        rating: interviewStages.rating,
        deletedAt: interviewStages.deletedAt,
        createdAt: interviewStages.createdAt,
        updatedAt: interviewStages.updatedAt,
      })
      .from(interviewStages);

    const conditions: any[] = [eq(interviewStages.id, id)];

    if (workspaceId) {
      // Join with candidates to check workspaceId
      query = query.leftJoin(candidates, eq(interviewStages.candidateId, candidates.id)) as any;
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [stage] = await query.where(and(...conditions)).limit(1);
    return stage || undefined;
  }

  async updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>, workspaceId?: number): Promise<InterviewStage> {
    this.ensureDb();
    try {
      // Security check: verify workspace access if workspaceId is provided
      if (workspaceId) {
        const existingStage = await this.getInterviewStage(id, workspaceId);
        if (!existingStage) {
          throw new Error('Interview stage not found or access denied');
        }
      }

      const updateData = { ...stage };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }
      if (updateData.completedAt && typeof updateData.completedAt === 'string') {
        updateData.completedAt = new Date(updateData.completedAt);
      }

      const [updatedStage] = await db
        .update(interviewStages)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(interviewStages.id, id))
        .returning();

      if (!updatedStage) {
        throw new Error('Interview stage not found');
      }

      // If stage is completed successfully, move to next stage
      if (updatedStage && stage.status === 'passed' && updatedStage.candidateId) {
        const candidate = await db
          .select()
          .from(candidates)
          .where(eq(candidates.id, updatedStage.candidateId))
          .limit(1);
        if (candidate[0]) {
          const nextStageIndex = updatedStage.stageIndex + 1;

          // Update candidate's current stage index to reflect that this stage is completed
          await db
            .update(candidates)
            .set({ currentStageIndex: nextStageIndex, updatedAt: new Date() })
            .where(eq(candidates.id, updatedStage.candidateId));

          const nextStage = await db
            .select()
            .from(interviewStages)
            .where(
              and(
                eq(interviewStages.candidateId, updatedStage.candidateId),
                eq(interviewStages.stageIndex, nextStageIndex)
              )
            )
            .limit(1);

          if (nextStage[0]) {
            // Create notification for next stage interviewer if assigned
            if (nextStage[0].interviewerId) {
              await db.insert(notifications).values({
                userId: nextStage[0].interviewerId,
                type: 'interview_assigned',
                title: t('newInterview'),
                message: t('candidatePassedStage', 'ru', { stageName: nextStage[0].stageName }),
                relatedEntityType: 'interview_stage',
                relatedEntityId: nextStage[0].id,
                isRead: false,
              });
            }
          } else {
            // No more stages, move to documentation status instead of hired
            await db
              .update(candidates)
              .set({ status: 'documentation', updatedAt: new Date() })
              .where(eq(candidates.id, updatedStage.candidateId));
          }
        }
      } else if (updatedStage && stage.status === 'failed' && updatedStage.candidateId) {
        // Mark candidate as rejected
        await db
          .update(candidates)
          .set({
            status: 'rejected',
            rejectionStage: updatedStage.stageIndex,
            rejectionReason: stage.comments || 'Failed interview stage',
            updatedAt: new Date()
          })
          .where(eq(candidates.id, updatedStage.candidateId));
      }

      return updatedStage;
    } catch (error) {
      logger.error('Error in updateInterviewStage:', error);
      throw error;
    }
  }

  async syncInterviewStages(candidateId: number, stages: (InsertInterviewStage & { id?: number })[]): Promise<void> {
    this.ensureDb();
    try {
      // 1. Get existing stages
      const existingStages = await db
        .select()
        .from(interviewStages)
        .where(eq(interviewStages.candidateId, candidateId));

      const existingStageIds = new Set(existingStages.map((s: InterviewStage) => s.id));
      const newStageIds = new Set(stages.filter((s) => s.id).map((s) => s.id as number));

      // 2. Identify stages to delete (exist in DB but not in new list)
      const stagesToDelete = existingStages.filter((s: InterviewStage) => !newStageIds.has(s.id));

      for (const stage of stagesToDelete) {
        // Delete associated interviews first
        await db.delete(interviews).where(eq(interviews.stageId, stage.id));
        // Delete the stage
        await db.delete(interviewStages).where(eq(interviewStages.id, stage.id));
      }

      // 3. Upsert stages
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];

        if (stage.id && existingStageIds.has(stage.id)) {
          // Update existing stage
          // Preserve status and other fields if not explicitly overwritten, 
          // but here we mainly want to update metadata like name/interviewer/index
          await db
            .update(interviewStages)
            .set({
              stageIndex: i, // Update index in case of reordering
              stageName: stage.stageName,
              interviewerId: stage.interviewerId,
              updatedAt: new Date()
            })
            .where(eq(interviewStages.id, stage.id));
        } else {
          // Create new stage
          await db.insert(interviewStages).values({
            candidateId,
            stageIndex: i,
            stageName: stage.stageName,
            interviewerId: stage.interviewerId,
            status: stage.status || 'waiting', // Default status
          });
        }
      }
    } catch (error) {
      logger.error('Error syncing interview stages:', error);
      throw error;
    }
  }

  async scheduleInterview(stageId: number, interviewerId: number, scheduledAt: Date, duration: number = 30): Promise<Interview> {
    this.ensureDb();
    try {
      // Simplified conflict check - check if there's any overlap in scheduled time
      const startTime = new Date(scheduledAt);
      const endTime = new Date(scheduledAt.getTime() + duration * 60000);

      // Get all scheduled interviews for this interviewer
      const existingInterviews = await db
        .select()
        .from(interviews)
        .where(
          and(
            eq(interviews.interviewerId, interviewerId),
            eq(interviews.status, 'scheduled'),
            // Optimization: only check interviews on the same day
            gte(interviews.scheduledAt, new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate())),
            lte(interviews.scheduledAt, new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), scheduledAt.getDate(), 23, 59, 59))
          )
        );

      // Check for time conflicts manually
      const conflicts = existingInterviews.filter((interview: Interview) => {
        const existingStart = new Date(interview.scheduledAt);
        const interviewDuration = interview.duration ?? 30; // Default to 30 minutes if null
        const existingEnd = new Date(interview.scheduledAt.getTime() + interviewDuration * 60000);

        // Check if new interview overlaps with existing one
        const overlaps = (startTime < existingEnd && endTime > existingStart);

        return overlaps;
      });

      if (conflicts.length > 0) {
        const conflictTime = conflicts[0].scheduledAt.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
        throw new Error(`Интервьюер занят в это время. Конфликт с собеседованием в ${conflictTime}`);
      }

      // Get stage and candidate info
      const stage = await db
        .select({
          candidateId: interviewStages.candidateId,
          stageName: interviewStages.stageName,
        })
        .from(interviewStages)
        .where(eq(interviewStages.id, stageId))
        .limit(1);

      if (!stage[0]) {
        throw new Error('Stage not found');
      }

      const [interview] = await db
        .insert(interviews)
        .values({
          stageId,
          candidateId: stage[0].candidateId,
          interviewerId,
          scheduledAt,
          duration,
          status: 'scheduled',
        })
        .returning();

      // Update the interview stage status and scheduled time
      await db
        .update(interviewStages)
        .set({
          status: 'in_progress',
          scheduledAt: scheduledAt,
          updatedAt: new Date()
        })
        .where(eq(interviewStages.id, stageId));

      // Create notification for interviewer
      await db.insert(notifications).values({
        userId: interviewerId,
        type: 'interview_scheduled',
        title: t('newInterview'),
        message: t('interviewScheduledOn', 'ru', {
          stageName: stage[0].stageName,
          date: scheduledAt.toLocaleString('ru-RU')
        }),
        relatedEntityType: 'interview',
        relatedEntityId: interview.id,
        isRead: false,
      });

      return interview;
    } catch (error) {
      logger.error('Error in scheduleInterview:', error);
      throw error;
    }
  }

  async getArchivedCandidates(workspaceId?: number): Promise<Candidate[]> {
    this.ensureDb();
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
        deletedAt: candidates.deletedAt,
        parsedResumeData: candidates.parsedResumeData,
        createdBy: candidates.createdBy,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates);

    const conditions: Array<ReturnType<typeof eq | typeof or>> = [
      or(
        eq(candidates.status, 'hired'),
        eq(candidates.status, 'rejected'),
        eq(candidates.status, 'dismissed')
      )
    ];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await baseQuery
      .where(and(...conditions))
      .orderBy(desc(candidates.updatedAt));
  }

  async getArchivedCandidatesWithAttachments(workspaceId?: number): Promise<any[]> {
    this.ensureDb();
    const archivedCandidates = await this.getArchivedCandidates(workspaceId);

    // Get attachments for each candidate
    const candidatesWithAttachments = await Promise.all(
      archivedCandidates.map(async (candidate) => {
        const attachments = await this.getDocumentationAttachments(candidate.id);
        return {
          ...candidate,
          documentationAttachments: attachments,
        };
      })
    );

    return candidatesWithAttachments;
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
    return updatedCandidate;
  }

  async getInterview(interviewId: number, workspaceId?: number): Promise<any> {
    this.ensureDb();
    let query = db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        outcome: interviews.outcome,
        notes: interviews.notes,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id));

    const conditions: any[] = [eq(interviews.id, interviewId)];
    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    const [interview] = await query.where(and(...conditions));

    return interview;
  }

  async rescheduleInterview(interviewId: number, newDateTime: Date): Promise<Interview> {
    this.ensureDb();
    const [interview] = await db
      .update(interviews)
      .set({
        scheduledAt: newDateTime,
        updatedAt: new Date()
      })
      .where(eq(interviews.id, interviewId))
      .returning();

    if (interview) {
      // Create notification
      await db.insert(notifications).values({
        userId: interview.interviewerId,
        type: 'interview_rescheduled',
        title: t('interviewRescheduled'),
        message: t('interviewRescheduledTo', 'ru', { date: newDateTime.toLocaleString('ru-RU') }),
        relatedEntityType: 'interview',
        relatedEntityId: interview.id,
        isRead: false,
      });
    }

    return interview;
  }

  async updateInterviewOutcome(interviewId: number, outcome: 'passed' | 'failed', notes?: string): Promise<Interview> {
    this.ensureDb();
    const [interview] = await db
      .update(interviews)
      .set({
        outcome,
        notes: notes || '',
        status: 'completed',
        updatedAt: new Date()
      })
      .where(eq(interviews.id, interviewId))
      .returning();

    return interview;
  }

  async getInterviews(workspaceId?: number): Promise<any[]> {
    this.ensureDb();
    const baseQuery = db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        meetingLink: interviews.meetingLink,
        outcome: interviews.outcome,
        notes: interviews.notes,
        deletedAt: interviews.deletedAt,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          city: candidates.city,
          vacancyId: candidates.vacancyId,
        },
        vacancy: {
          id: vacancies.id,
          title: vacancies.title,
          department: vacancies.department,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
          stageIndex: interviewStages.stageIndex,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id));

    if (workspaceId) {
      return await baseQuery
        .where(eq(candidates.workspaceId, workspaceId))
        .orderBy(interviews.scheduledAt);
    }

    return await baseQuery.orderBy(interviews.scheduledAt);
  }

  async getInterviewsByInterviewer(interviewerId: number, workspaceId?: number): Promise<any[]> {
    this.ensureDb();
    const baseQuery = db
      .select({
        id: interviews.id,
        stageId: interviews.stageId,
        candidateId: interviews.candidateId,
        interviewerId: interviews.interviewerId,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        status: interviews.status,
        meetingLink: interviews.meetingLink,
        outcome: interviews.outcome,
        notes: interviews.notes,
        deletedAt: interviews.deletedAt,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
        candidate: {
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          city: candidates.city,
          vacancyId: candidates.vacancyId,
        },
        vacancy: {
          id: vacancies.id,
          title: vacancies.title,
          department: vacancies.department,
        },
        stage: {
          id: interviewStages.id,
          stageName: interviewStages.stageName,
          stageIndex: interviewStages.stageIndex,
        },
        interviewer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          position: users.position,
        },
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(vacancies, eq(candidates.vacancyId, vacancies.id))
      .leftJoin(interviewStages, eq(interviews.stageId, interviewStages.id))
      .leftJoin(users, eq(interviews.interviewerId, users.id));

    const conditions = [eq(interviews.interviewerId, interviewerId)];

    if (workspaceId) {
      conditions.push(eq(candidates.workspaceId, workspaceId));
    }

    return await baseQuery.where(and(...conditions)).orderBy(asc(interviews.scheduledAt));
  }

  async getInterviewsByDateRange(start: Date, end: Date, workspaceId?: number): Promise<Interview[]> {
    this.ensureDb();
    const conditions: Array<ReturnType<typeof gte | typeof lte>> = [
      gte(interviews.scheduledAt, start),
      lte(interviews.scheduledAt, end)
    ];

    if (workspaceId) {
      // We need to join candidates to filter by workspaceId, but the return type is Interview[]
      // So we can use a subquery or join. Since this method returns Interview[], let's just select from interviews
      // but we need to filter by candidate's workspace.
      // However, doing a join here might change the returned columns if not careful.
      // A better approach for this specific method is to join but select only interview fields.
      // But wait, the original implementation just did select().from(interviews).
      // I'll use a join and select interviews.*

      return await db
        .select({
          id: interviews.id,
          stageId: interviews.stageId,
          candidateId: interviews.candidateId,
          interviewerId: interviews.interviewerId,
          scheduledAt: interviews.scheduledAt,
          duration: interviews.duration,
          status: interviews.status,
          meetingLink: interviews.meetingLink,
          outcome: interviews.outcome,
          notes: interviews.notes,
          deletedAt: interviews.deletedAt,
          createdAt: interviews.createdAt,
          updatedAt: interviews.updatedAt,
        })
        .from(interviews)
        .innerJoin(candidates, eq(interviews.candidateId, candidates.id))
        .where(
          and(
            gte(interviews.scheduledAt, start),
            lte(interviews.scheduledAt, end),
            eq(candidates.workspaceId, workspaceId)
          )
        )
        .orderBy(asc(interviews.scheduledAt));
    }

    return await db
      .select()
      .from(interviews)
      .where(
        and(
          gte(interviews.scheduledAt, start),
          lte(interviews.scheduledAt, end)
        )
      )
      .orderBy(asc(interviews.scheduledAt));
  }

  async getInterviewsByStage(stageId: number): Promise<Interview[]> {
    this.ensureDb();
    return await db
      .select()
      .from(interviews)
      .where(eq(interviews.stageId, stageId))
      .orderBy(asc(interviews.scheduledAt));
  }

  async createInterview(interview: InsertInterview): Promise<Interview> {
    this.ensureDb();
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  async updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview> {
    this.ensureDb();
    // Convert date strings to Date objects
    const updateData = { ...interview };
    if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }

    const [updatedInterview] = await db
      .update(interviews)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(interviews.id, id))
      .returning();
    return updatedInterview;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    this.ensureDb();
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    this.ensureDb();
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: number, userId: number): Promise<void> {
    this.ensureDb();
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    this.ensureDb();
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification || undefined;
  }

  async deleteNotification(id: number): Promise<void> {
    this.ensureDb();
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    this.ensureDb();
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(workspaceId: number, limit: number = 50, offset: number = 0): Promise<{ logs: AuditLog[]; total: number }> {
    this.ensureDb();

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.workspaceId, workspaceId));

    const total = totalResult ? Number(totalResult.count) : 0;

    // Get logs with user info
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        createdAt: auditLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        }
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(users.workspaceId, workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { logs: logs as any[], total };
  }

  async getSystemSetting(key: string, workspaceId: number): Promise<SystemSetting | undefined> {
    this.ensureDb();
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(and(eq(systemSettings.workspaceId, workspaceId), eq(systemSettings.key, key)));
    return setting || undefined;
  }

  async getSystemSettings(workspaceId: number): Promise<SystemSetting[]> {
    this.ensureDb();
    return await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.workspaceId, workspaceId))
      .orderBy(systemSettings.key);
  }

  async setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    this.ensureDb();
    const [newSetting] = await db
      .insert(systemSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: [systemSettings.workspaceId, systemSettings.key],
        set: { value: setting.value, description: setting.description, updatedAt: new Date() }
      })
      .returning();
    return newSetting;
  }

  async getDashboardStats(workspaceId: number): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    todayInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }> {
    this.ensureDb();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Optimize with parallel queries - filter by workspaceId
    const [
      activeVacanciesResult,
      activeCandidatesResult,
      todayInterviewsResult,
      hiredThisMonthResult,
      documentationCandidatesResult
    ] = await Promise.all([
      db.select({ count: count() }).from(vacancies).where(
        and(eq(vacancies.status, "active"), eq(vacancies.workspaceId, workspaceId))
      ),
      db.select({ count: count() }).from(candidates).where(
        and(eq(candidates.status, "active"), eq(candidates.workspaceId, workspaceId))
      ),
      db.select({ count: count() })
        .from(interviews)
        .innerJoin(candidates, eq(interviews.candidateId, candidates.id))
        .where(
          and(
            eq(candidates.workspaceId, workspaceId),
            gte(interviews.scheduledAt, startOfToday),
            lte(interviews.scheduledAt, endOfToday),
            eq(interviews.status, "scheduled")
          )
        ),
      db.select({ count: count() }).from(candidates).where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      ),
      db.select({ count: count() }).from(candidates).where(
        and(eq(candidates.status, "documentation"), eq(candidates.workspaceId, workspaceId))
      )
    ]);

    return {
      activeVacancies: activeVacanciesResult[0].count,
      activeCandidates: activeCandidatesResult[0].count,
      todayInterviews: todayInterviewsResult[0].count,
      hiredThisMonth: hiredThisMonthResult[0].count,
      documentationCandidates: documentationCandidatesResult[0].count,
    };
  }

  async getHiringTrends(workspaceId: number): Promise<any[]> {
    this.ensureDb();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trends = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`,
        hired: sql<number>`COUNT(CASE WHEN ${candidates.status} = 'hired' THEN 1 END)`,
        applications: sql<number>`COUNT(*)`,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.createdAt, sixMonthsAgo),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`);

    return trends;
  }

  async getDepartmentStats(workspaceId: number): Promise<any[]> {
    this.ensureDb();
    const stats = await db
      .select({
        department: vacancies.department,
        count: sql<number>`COUNT(${candidates.id})`,
      })
      .from(vacancies)
      .leftJoin(candidates, eq(candidates.vacancyId, vacancies.id))
      .where(
        and(
          eq(vacancies.workspaceId, workspaceId),
          eq(candidates.status, 'hired')
        )
      )
      .groupBy(vacancies.department)
      .orderBy(sql<number>`COUNT(${candidates.id}) DESC`);

    return stats;
  }

  async getTimeToHireStats(workspaceId: number): Promise<{
    averageDays: number;
    fastest: number;
    median: number;
    slowest: number;
  }> {
    this.ensureDb();
    const hiredCandidates = await db
      .select({
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, 'hired'),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    if (hiredCandidates.length === 0) {
      return { averageDays: 0, fastest: 0, median: 0, slowest: 0 };
    }

    const daysDiff = hiredCandidates.map((candidate) => {
      const created = candidate.createdAt ? new Date(candidate.createdAt) : new Date();
      const hired = candidate.updatedAt ? new Date(candidate.updatedAt) : new Date();
      return Math.ceil((hired.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });

    daysDiff.sort((a: number, b: number) => a - b);

    const averageDays = Math.round(daysDiff.reduce((sum: number, days: number) => sum + days, 0) / daysDiff.length);
    const fastest = daysDiff[0];
    const slowest = daysDiff[daysDiff.length - 1];
    const median = daysDiff[Math.floor(daysDiff.length / 2)];

    return {
      averageDays,
      fastest,
      median,
      slowest,
    };
  }

  async getConversionFunnel(workspaceId: number): Promise<{
    stages: { stageName: string; stageIndex: number; count: number }[];
    applications: number;
    hired: number;
  }> {
    this.ensureDb();
    // Exclude candidates created directly in documentation (manual_documentation)
    // as they haven't gone through the interview process
    const [applicationsResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    // Get all unique stages from all candidates (based on their interview stage chains)
    // We need to extract all unique stage names and indices from actual data
    const allStages = await db
      .selectDistinct({
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex,
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .orderBy(interviewStages.stageIndex);

    // Count how many candidates passed each stage
    const passedStagesData = await db
      .select({
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex,
        count: count(),
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(interviewStages.status, "passed"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .groupBy(interviewStages.stageName, interviewStages.stageIndex)
      .orderBy(interviewStages.stageIndex);

    // Create a map for quick lookup
    const passedCountMap = new Map();
    passedStagesData.forEach((s: any) => {
      passedCountMap.set(`${s.stageIndex}-${s.stageName}`, Number(s.count));
    });

    // Build result with all stages, showing 0 if no one passed
    const stages = allStages.map((s: any) => ({
      stageName: s.stageName,
      stageNumber: s.stageIndex + 1,
      stageIndex: s.stageIndex,
      count: passedCountMap.get(`${s.stageIndex}-${s.stageName}`) || 0,
    }));

    const [hiredResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, "hired"),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    return {
      stages,
      applications: applicationsResult.count,
      hired: hiredResult.count,
    };
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    this.ensureDb();
    const result = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderId_user: users.id,
        senderFullName: users.fullName,
        senderPosition: users.position,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
          and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
        )
      )
      .orderBy(asc(messages.createdAt));

    // Format the result to match Message type
    return result.map((row: any) => ({
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sender: row.senderId_user ? {
        id: row.senderId_user,
        fullName: row.senderFullName || '',
        position: row.senderPosition || '',
      } : undefined
    })) as Message[];
  }

  async createMessage(message: InsertMessage): Promise<any> {
    this.ensureDb();
    const [newMessage] = await db.insert(messages).values(message).returning();

    // Get message with sender info
    const [messageWithSender] = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderId_user: users.id,
        senderFullName: users.fullName,
        senderPosition: users.position,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, newMessage.id));

    // Format the result to include sender object
    return {
      id: messageWithSender.id,
      senderId: messageWithSender.senderId,
      receiverId: messageWithSender.receiverId,
      content: messageWithSender.content,
      isRead: messageWithSender.isRead,
      createdAt: messageWithSender.createdAt,
      updatedAt: messageWithSender.updatedAt,
      sender: messageWithSender.senderId_user ? {
        id: messageWithSender.senderId_user,
        fullName: messageWithSender.senderFullName || '',
        position: messageWithSender.senderPosition || '',
      } : undefined
    };
  }

  async getConversationsByUser(userId: number, workspaceId?: number): Promise<User[]> {
    this.ensureDb();
    // Get unique users who have had conversations with the current user
    const senderConditions: any[] = [
      eq(messages.receiverId, userId),
      sql`${users.id} != ${userId}`
    ];

    if (workspaceId) {
      senderConditions.push(eq(users.workspaceId, workspaceId));
    }

    const senderUsers = await db
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        email: users.email,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(and(...senderConditions));

    const receiverConditions: any[] = [
      eq(messages.senderId, userId),
      sql`${users.id} != ${userId}`
    ];

    if (workspaceId) {
      receiverConditions.push(eq(users.workspaceId, workspaceId));
    }

    const receiverUsers = await db
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        position: users.position,
        email: users.email,
      })
      .from(messages)
      .innerJoin(users, eq(messages.receiverId, users.id))
      .where(and(...receiverConditions));

    // Combine and deduplicate
    const allUsers = [...senderUsers, ...receiverUsers];
    const uniqueUsers = allUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    return uniqueUsers as User[];
  }

  async getHiredAndDismissedStats(workspaceId: number): Promise<{
    totalHired: number;
    totalDismissed: number;
    currentlyEmployed: number;
  }> {
    this.ensureDb();

    const [[hiredResult], [dismissedResult], [currentlyEmployedResult]] = await Promise.all([
      db.select({ count: count() }).from(candidates).where(and(eq(candidates.status, 'hired'), eq(candidates.workspaceId, workspaceId))),
      db.select({ count: count() }).from(candidates).where(and(eq(candidates.status, 'dismissed'), eq(candidates.workspaceId, workspaceId))),
      db.select({ count: count() }).from(candidates).where(and(eq(candidates.status, 'active'), eq(candidates.workspaceId, workspaceId))),
    ]);

    return {
      totalHired: hiredResult.count,
      totalDismissed: dismissedResult.count,
      currentlyEmployed: currentlyEmployedResult.count,
    };
  }

  async getHiredAndDismissedStatsByMonth(workspaceId: number): Promise<{
    month: string;
    monthName: string;
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]> {
    this.ensureDb();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Get hired candidates by month
    const hiredByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'hired'),
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.updatedAt, oneYearAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.updatedAt}, 'YYYY-MM')`);

    // Get dismissed candidates by month
    const dismissedByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'dismissed'),
          eq(candidates.workspaceId, workspaceId),
          sql`${candidates.dismissalDate} IS NOT NULL`,
          gte(candidates.dismissalDate, oneYearAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${candidates.dismissalDate}, 'YYYY-MM')`);

    // Combine results
    const monthMap = new Map<string, { hired: number; dismissed: number }>();

    hiredByMonth.forEach((item: any) => {
      monthMap.set(item.month, { hired: item.count, dismissed: 0 });
    });

    dismissedByMonth.forEach((item: any) => {
      const existing = monthMap.get(item.month) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      monthMap.set(item.month, existing);
    });

    // Convert to array and sort
    const result = Array.from(monthMap.entries())
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return {
          month,
          monthName: monthNames[parseInt(monthNum) - 1],
          year,
          hired: data.hired,
          dismissed: data.dismissed,
          netChange: data.hired - data.dismissed,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return result;
  }

  async getHiredAndDismissedStatsByYear(workspaceId: number): Promise<{
    year: string;
    hired: number;
    dismissed: number;
    netChange: number;
  }[]> {
    this.ensureDb();

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // Get hired candidates by year
    const hiredByYear = await db
      .select({
        year: sql<string>`EXTRACT(YEAR FROM ${candidates.updatedAt})::text`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'hired'),
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.updatedAt, fiveYearsAgo)
        )
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${candidates.updatedAt})`);

    // Get dismissed candidates by year
    const dismissedByYear = await db
      .select({
        year: sql<string>`EXTRACT(YEAR FROM ${candidates.dismissalDate})::text`,
        count: count(),
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, 'dismissed'),
          eq(candidates.workspaceId, workspaceId),
          sql`${candidates.dismissalDate} IS NOT NULL`,
          gte(candidates.dismissalDate, fiveYearsAgo)
        )
      )
      .groupBy(sql`EXTRACT(YEAR FROM ${candidates.dismissalDate})`);

    // Combine results
    const yearMap = new Map<string, { hired: number; dismissed: number }>();

    hiredByYear.forEach((item: any) => {
      yearMap.set(item.year, { hired: item.count, dismissed: 0 });
    });

    dismissedByYear.forEach((item: any) => {
      const existing = yearMap.get(item.year) || { hired: 0, dismissed: 0 };
      existing.dismissed = item.count;
      yearMap.set(item.year, existing);
    });

    // Convert to array and sort
    const result = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        hired: data.hired,
        dismissed: data.dismissed,
        netChange: data.hired - data.dismissed,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return result;
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<Message> {
    this.ensureDb();
    // Only mark as read if the user is the receiver
    const [updatedMessage] = await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.id, messageId), eq(messages.receiverId, userId)))
      .returning();

    return updatedMessage;
  }

  async getRejectionsByStage(workspaceId: number): Promise<{ stage: number; rejections: number; stageName: string }[]> {
    this.ensureDb();

    // Get all unique stage indices and names from interview_stages for this workspace
    const allStages = await db
      .selectDistinct({
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(eq(candidates.workspaceId, workspaceId))
      .orderBy(interviewStages.stageIndex);

    // Get all rejected candidates and their current stage for this workspace
    const rejectedCandidates = await db
      .select({
        currentStage: candidates.currentStageIndex,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, 'rejected')
        )
      );

    // Count rejections by stage index
    const stageRejections = new Map<number, number>();
    rejectedCandidates.forEach((candidate: any) => {
      const stage = candidate.currentStage;
      if (stage !== null && stage !== undefined) {
        stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
      }
    });

    // Build result with simple stage names like "1 этап", "2 этап", etc.
    const result = allStages.map((s: any) => ({
      stage: s.stageIndex + 1, // Display as 1, 2, 3, etc.
      rejections: stageRejections.get(s.stageIndex) || 0,
      stageNumber: s.stageIndex + 1,
      stageName: s.stageName || `Stage ${s.stageIndex + 1}`, // Use actual name or fallback
    }));

    return result;
  }

  async getDashboardStatsByMonth(workspaceId: number, month: string, year: string): Promise<{
    activeVacancies: number;
    activeCandidates: number;
    monthlyInterviews: number;
    hiredThisMonth: number;
    documentationCandidates: number;
  }> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    const [activeVacanciesResult] = await db
      .select({ count: count() })
      .from(vacancies)
      .where(
        and(
          eq(vacancies.status, "active"),
          eq(vacancies.workspaceId, workspaceId)
        )
      );

    const [activeCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, "active"),
          eq(candidates.workspaceId, workspaceId)
        )
      );

    const [monthlyInterviewsResult] = await db
      .select({ count: count() })
      .from(interviews)
      .innerJoin(candidates, eq(interviews.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          gte(interviews.scheduledAt, startOfMonth),
          lte(interviews.scheduledAt, endOfMonth)
        )
      );

    const [hiredThisMonthResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      );

    const [documentationCandidatesResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.status, "documentation"),
          eq(candidates.workspaceId, workspaceId)
        )
      );

    return {
      activeVacancies: activeVacanciesResult.count,
      activeCandidates: activeCandidatesResult.count,
      monthlyInterviews: monthlyInterviewsResult.count,
      hiredThisMonth: hiredThisMonthResult.count,
      documentationCandidates: documentationCandidatesResult.count,
    };
  }

  async getConversionFunnelByMonth(workspaceId: number, month: string, year: string): Promise<{
    stages: { stageName: string; stageIndex: number; count: number }[];
    applications: number;
    hired: number;
  }> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    // Exclude candidates created directly in documentation (manual_documentation)
    // as they haven't gone through the interview process
    const [applicationsResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    // Get all unique stages from candidates created this month
    const allStages = await db
      .selectDistinct({
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex,
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .orderBy(interviewStages.stageIndex);

    // Count how many candidates passed each stage this month
    const passedStagesData = await db
      .select({
        stageName: interviewStages.stageName,
        stageIndex: interviewStages.stageIndex,
        count: count(),
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(interviewStages.status, "passed"),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      )
      .groupBy(interviewStages.stageName, interviewStages.stageIndex)
      .orderBy(interviewStages.stageIndex);

    // Create a map for quick lookup
    const passedCountMap = new Map();
    passedStagesData.forEach((s: any) => {
      passedCountMap.set(`${s.stageIndex}-${s.stageName}`, Number(s.count));
    });

    // Build result with all stages, showing 0 if no one passed
    const stages = allStages.map((s: any) => ({
      stageName: s.stageName,
      stageIndex: s.stageIndex,
      count: passedCountMap.get(`${s.stageIndex}-${s.stageName}`) || 0,
    }));

    // For hired candidates, we exclude manual_documentation but allow them to contribute
    // to hired count if they were hired through the normal process
    const [hiredResult] = await db
      .select({ count: count() })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, "hired"),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth),
          sql`${candidates.source} != 'manual_documentation' OR ${candidates.source} IS NULL`
        )
      );

    return {
      stages,
      applications: applicationsResult.count,
      hired: hiredResult.count,
    };
  }

  async getRejectionsByStageByMonth(workspaceId: number, month: string, year: string): Promise<{ stage: number; rejections: number; stageName: string }[]> {
    this.ensureDb();
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0);

    // Get all unique stage indices and names from interview_stages for this month
    const allStages = await db
      .selectDistinct({
        stageIndex: interviewStages.stageIndex,
        stageName: interviewStages.stageName,
      })
      .from(interviewStages)
      .innerJoin(candidates, eq(interviewStages.candidateId, candidates.id))
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          gte(candidates.createdAt, startOfMonth),
          lte(candidates.createdAt, endOfMonth)
        )
      )
      .orderBy(interviewStages.stageIndex);

    // Get rejected candidates and their current stage for this month
    const rejectedCandidates = await db
      .select({
        currentStage: candidates.currentStageIndex,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.workspaceId, workspaceId),
          eq(candidates.status, 'rejected'),
          gte(candidates.updatedAt, startOfMonth),
          lte(candidates.updatedAt, endOfMonth)
        )
      );

    // Count rejections by stage index
    const stageRejections = new Map<number, number>();
    rejectedCandidates.forEach((candidate: any) => {
      const stage = candidate.currentStage;
      if (stage !== null && stage !== undefined) {
        stageRejections.set(stage, (stageRejections.get(stage) || 0) + 1);
      }
    });

    // Build result with simple stage names like "1 этап", "2 этап", etc.
    const result = allStages.map((s: any) => ({
      stage: s.stageIndex + 1, // Display as 1, 2, 3, etc.
      rejections: stageRejections.get(s.stageIndex) || 0,
      stageNumber: s.stageIndex + 1,
      stageName: `Stage ${s.stageIndex + 1}`, // Fallback name
    }));

    return result;
  }

  async getAvailableDataPeriods(workspaceId: number): Promise<{ year: string; month: string; monthName: string }[]> {
    this.ensureDb();
    // Get unique months/years where we have candidates data for this workspace
    const candidatePeriods = await db
      .select({
        period: sql<string>`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`,
      })
      .from(candidates)
      .where(eq(candidates.workspaceId, workspaceId))
      .groupBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${candidates.createdAt}, 'YYYY-MM') DESC`);

    // Get unique months/years where we have interviews data for this workspace
    const interviewPeriods = await db
      .select({
        period: sql<string>`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`,
      })
      .from(interviews)
      .innerJoin(candidates, eq(interviews.candidateId, candidates.id))
      .where(eq(candidates.workspaceId, workspaceId))
      .groupBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${interviews.scheduledAt}, 'YYYY-MM') DESC`);

    // Combine and deduplicate periods
    const allPeriods = new Set([
      ...(candidatePeriods as any[]).map((p: any) => p.period),
      ...(interviewPeriods as any[]).map((p: any) => p.period)
    ]);

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const result = Array.from(allPeriods)
      .sort()
      .reverse()
      .map(period => {
        const [year, month] = period.split('-');
        return {
          year,
          month,
          monthName: monthNames[parseInt(month) - 1]
        };
      });

    return result;
  }

  // Department methods
  async getDepartments(workspaceId?: number): Promise<Department[]> {
    this.ensureDb();
    if (workspaceId) {
      return await db.select().from(departments)
        .where(eq(departments.workspaceId, workspaceId))
        .orderBy(departments.name);
    }
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: number, workspaceId?: number): Promise<Department | undefined> {
    this.ensureDb();
    if (workspaceId) {
      const [department] = await db
        .select()
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.workspaceId, workspaceId)));
      return department || undefined;
    }

    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));
    return department || undefined;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    this.ensureDb();
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>, workspaceId?: number): Promise<Department> {
    this.ensureDb();
    const conditions: any[] = [eq(departments.id, id)];
    if (workspaceId !== undefined) {
      conditions.push(eq(departments.workspaceId, workspaceId));
    }

    const [updated] = await db
      .update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return updated;
  }

  async deleteDepartment(id: number, workspaceId?: number): Promise<void> {
    this.ensureDb();
    const conditions: any[] = [eq(departments.id, id)];
    if (workspaceId !== undefined) {
      conditions.push(eq(departments.workspaceId, workspaceId));
    }

    await db
      .delete(departments)
      .where(and(...conditions));
  }

  // Documentation Attachment methods
  async getDocumentationAttachments(candidateId: number): Promise<DocumentationAttachment[]> {
    this.ensureDb();
    return await db
      .select({
        id: documentationAttachments.id,
        candidateId: documentationAttachments.candidateId,
        filename: documentationAttachments.filename,
        originalName: documentationAttachments.originalName,
        fileType: documentationAttachments.fileType,
        fileSize: documentationAttachments.fileSize,
        uploadedBy: documentationAttachments.uploadedBy,
        createdAt: documentationAttachments.createdAt,
        uploadedByUser: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(documentationAttachments)
      .leftJoin(users, eq(documentationAttachments.uploadedBy, users.id))
      .where(eq(documentationAttachments.candidateId, candidateId))
      .orderBy(desc(documentationAttachments.createdAt));
  }

  async getDocumentationAttachment(id: number): Promise<DocumentationAttachment | undefined> {
    this.ensureDb();
    const [attachment] = await db
      .select()
      .from(documentationAttachments)
      .where(eq(documentationAttachments.id, id));
    return attachment || undefined;
  }

  async createDocumentationAttachment(attachment: InsertDocumentationAttachment): Promise<DocumentationAttachment> {
    this.ensureDb();
    const [newAttachment] = await db
      .insert(documentationAttachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  async deleteDocumentationAttachment(id: number): Promise<void> {
    this.ensureDb();
    await db
      .delete(documentationAttachments)
      .where(eq(documentationAttachments.id, id));
  }
}

export const storage = new DatabaseStorage();

