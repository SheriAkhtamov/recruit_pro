import {
  type User, type InsertUser, type Vacancy, type InsertVacancy,
  type Candidate, type InsertCandidate, type InterviewStage,
  type InsertInterviewStage, type Interview, type InsertInterview,
  type Notification, type InsertNotification, type AuditLog,
  type InsertAuditLog, type SystemSetting, type InsertSystemSetting,
  type Message, type InsertMessage, type Department, type InsertDepartment,
  type DocumentationAttachment, type InsertDocumentationAttachment,
  type Workspace, type InsertWorkspace, type SuperAdmin, type InsertSuperAdmin
} from "@shared/schema";

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

  // Users
  getUser(id: number, workspaceId?: number): Promise<User | undefined>;
  getUserByEmail(email: string, workspaceId?: number): Promise<User | undefined>;
  getUserByLoginOrEmail(loginOrEmail: string, workspaceId?: number): Promise<User | undefined>;
  getUsers(workspaceId?: number): Promise<User[]>;
  getUserWithPassword(id: number, workspaceId?: number): Promise<User | undefined>;
  getWorkspaceAdminUser(workspaceId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  getUsersWithOnlineStatus(workspaceId?: number): Promise<User[]>;

  // Vacancies
  getVacancies(workspaceId?: number): Promise<Vacancy[]>;
  getVacancy(id: number, workspaceId?: number): Promise<Vacancy | undefined>;
  createVacancy(vacancy: InsertVacancy): Promise<Vacancy>;
  updateVacancy(id: number, vacancy: Partial<InsertVacancy>, workspaceId?: number): Promise<Vacancy>;
  deleteVacancy(id: number): Promise<void>;
  getActiveVacancies(workspaceId?: number): Promise<Vacancy[]>;

  // Candidates
  getCandidates(workspaceId?: number): Promise<Candidate[]>;
  getActiveCandidates(workspaceId?: number): Promise<Candidate[]>;
  getCandidate(id: number, workspaceId?: number): Promise<Candidate | undefined>;
  getCandidatesByVacancy(vacancyId: number): Promise<Candidate[]>;
  getCandidatesByInterviewer(interviewerId: number, workspaceId?: number): Promise<Candidate[]>;
  getCandidatesByStatus(status: string, workspaceId?: number): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>, workspaceId?: number): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;
  dismissCandidate(id: number, dismissalReason: string, dismissalDate: Date, workspaceId?: number): Promise<Candidate>;

  // Interview Stages
  getInterviewStagesByCandidate(candidateId: number): Promise<InterviewStage[]>;
  getInterviewStage(id: number): Promise<InterviewStage | undefined>;
  deleteInterviewStage(id: number, workspaceId?: number): Promise<void>;
  deleteInterviewStagesByCandidate(candidateId: number): Promise<void>;
  getAllInterviewStages(): Promise<InterviewStage[]>;
  createInterviewStage(stage: InsertInterviewStage): Promise<InterviewStage>;
  updateInterviewStage(id: number, stage: Partial<InsertInterviewStage>): Promise<InterviewStage>;

  // Interviews
  getInterviews(workspaceId?: number): Promise<Interview[]>;
  getInterviewsByInterviewer(interviewerId: number, workspaceId?: number): Promise<Interview[]>;
  getInterviewsByCandidate(candidateId: number): Promise<Interview[]>;
  getInterview(id: number): Promise<Interview | undefined>;
  createInterview(interview: InsertInterview): Promise<Interview>;
  updateInterview(id: number, interview: Partial<InsertInterview>): Promise<Interview>;
  deleteInterview(id: number): Promise<void>;
  getInterviewsByDateRange(start: Date, end: Date, workspaceId?: number): Promise<Interview[]>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(workspaceId?: number): Promise<AuditLog[]>;

  // System Settings
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  updateSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;

  // Departments
  getDepartments(workspaceId?: number): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Messages
  getMessages(workspaceId?: number): Promise<Message[]>;
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;

  // Documentation Attachments
  getDocumentationAttachments(candidateId: number): Promise<DocumentationAttachment[]>;
  createDocumentationAttachment(attachment: InsertDocumentationAttachment): Promise<DocumentationAttachment>;
  deleteDocumentationAttachment(id: number): Promise<void>;

  // Analytics
  getDashboardStats(workspaceId?: number): Promise<any>;
  getConversionFunnel(workspaceId?: number): Promise<any>;
  getRejectionsByStage(workspaceId?: number): Promise<any>;
  getHiringTrends(workspaceId?: number): Promise<any>;
  getHiredDismissedStats(workspaceId?: number): Promise<any>;
  getHiredDismissedByMonth(workspaceId?: number): Promise<any[]>;
  getHiredDismissedByYear(workspaceId?: number): Promise<any[]>;
  getDepartmentStats(workspaceId?: number): Promise<any>;
  getTimeToHireStats(workspaceId?: number): Promise<any>;
  getDashboardStatsByMonth(month: string, year: string, workspaceId?: number): Promise<any>;
  getConversionFunnelByMonth(month: string, year: string, workspaceId?: number): Promise<any>;
  getRejectionsByStageByMonth(month: string, year: string, workspaceId?: number): Promise<any>;
  getArchivedCandidates(workspaceId?: number): Promise<Candidate[]>;
}
