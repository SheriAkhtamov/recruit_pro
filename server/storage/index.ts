/**
 * Modular Storage Layer
 * 
 * This file re-exports from the legacy storage.ts for methods that haven't been
 * migrated yet, while providing modular implementations for migrated parts.
 */

import { workspaceStorage } from './workspace.storage';
import { userStorage } from './user.storage';
import { vacancyStorage } from './vacancy.storage';
import { superAdminStorage } from './super-admin.storage';
import { notificationStorage } from './notification.storage';
import { auditStorage } from './audit.storage';
import { messageStorage } from './message.storage';

// Import only the DatabaseStorage class, not the storage instance
import { DatabaseStorage } from '../storage';

// Create instance of legacy storage for non-migrated methods
const legacyStorageInstance = new DatabaseStorage();

/**
 * Unified storage interface combining modular and legacy storage
 */
export const storage = {
    // Workspace operations (modular)
    getWorkspaces: workspaceStorage.getWorkspaces.bind(workspaceStorage),
    getWorkspace: workspaceStorage.getWorkspace.bind(workspaceStorage),
    createWorkspace: workspaceStorage.createWorkspace.bind(workspaceStorage),
    updateWorkspace: workspaceStorage.updateWorkspace.bind(workspaceStorage),
    deleteWorkspace: workspaceStorage.deleteWorkspace.bind(workspaceStorage),

    // Super Admin operations (modular)
    getSuperAdminByUsername: superAdminStorage.getSuperAdminByUsername.bind(superAdminStorage),
    getSuperAdmin: superAdminStorage.getSuperAdmin.bind(superAdminStorage),
    createSuperAdmin: superAdminStorage.createSuperAdmin.bind(superAdminStorage),

    // User operations (modular)
    getUser: userStorage.getUser.bind(userStorage),
    getUserByEmail: userStorage.getUserByEmail.bind(userStorage),
    getUserByLoginOrEmail: userStorage.getUserByLoginOrEmail.bind(userStorage),
    getUsers: userStorage.getUsers.bind(userStorage),
    getUserWithPassword: userStorage.getUserWithPassword.bind(userStorage),
    getWorkspaceAdminUser: userStorage.getWorkspaceAdminUser.bind(userStorage),
    createUser: userStorage.createUser.bind(userStorage),
    updateUser: userStorage.updateUser.bind(userStorage),
    deleteUser: userStorage.deleteUser.bind(userStorage),
    updateUserOnlineStatus: userStorage.updateUserOnlineStatus.bind(userStorage),
    getUsersWithOnlineStatus: userStorage.getUsersWithOnlineStatus.bind(userStorage),

    // Vacancy operations (modular)
    getVacancies: vacancyStorage.getVacancies.bind(vacancyStorage),
    getVacancy: vacancyStorage.getVacancy.bind(vacancyStorage),
    createVacancy: vacancyStorage.createVacancy.bind(vacancyStorage),
    updateVacancy: vacancyStorage.updateVacancy.bind(vacancyStorage),
    deleteVacancy: vacancyStorage.deleteVacancy.bind(vacancyStorage),
    getActiveVacancies: vacancyStorage.getActiveVacancies.bind(vacancyStorage),

    // Notification operations (modular)
    getNotificationsByUser: notificationStorage.getNotificationsByUser.bind(notificationStorage),
    createNotification: notificationStorage.createNotification.bind(notificationStorage),
    markNotificationAsRead: notificationStorage.markNotificationAsRead.bind(notificationStorage),
    markAllNotificationsAsRead: notificationStorage.markAllNotificationsAsRead.bind(notificationStorage),

    // Audit Log operations (modular)
    getAuditLogs: auditStorage.getAuditLogs.bind(auditStorage),
    createAuditLog: auditStorage.createAuditLog.bind(auditStorage),

    // Message operations (modular)
    getConversations: messageStorage.getConversations.bind(messageStorage),
    getConversationsByUser: messageStorage.getConversations.bind(messageStorage),
    getMessagesBetweenUsers: messageStorage.getMessagesBetweenUsers.bind(messageStorage),
    createMessage: messageStorage.createMessage.bind(messageStorage),
    updateMessage: messageStorage.updateMessage.bind(messageStorage),
    markMessageAsRead: async (id: number, userId: number) => {
        if (!userId) {
            throw new Error('userId is required to mark message as read');
        }
        return messageStorage.markMessageAsRead(id, userId);
    },

    // Candidate operations (legacy - still in storage.ts)
    getCandidates: legacyStorageInstance.getCandidates.bind(legacyStorageInstance),
    getActiveCandidates: legacyStorageInstance.getActiveCandidates.bind(legacyStorageInstance),
    getCandidate: legacyStorageInstance.getCandidate.bind(legacyStorageInstance),
    getCandidatesByVacancy: legacyStorageInstance.getCandidatesByVacancy.bind(legacyStorageInstance),
    getCandidatesByInterviewer: legacyStorageInstance.getCandidatesByInterviewer.bind(legacyStorageInstance),
    getCandidatesByStatus: legacyStorageInstance.getCandidatesByStatus.bind(legacyStorageInstance),
    createCandidate: legacyStorageInstance.createCandidate.bind(legacyStorageInstance),
    updateCandidate: legacyStorageInstance.updateCandidate.bind(legacyStorageInstance),
    deleteCandidate: legacyStorageInstance.deleteCandidate.bind(legacyStorageInstance),

    // Interview operations (legacy - still in storage.ts)
    getInterviewStagesByCandidate: legacyStorageInstance.getInterviewStagesByCandidate.bind(legacyStorageInstance),
    createInterviewStage: legacyStorageInstance.createInterviewStage.bind(legacyStorageInstance),
    updateInterviewStage: legacyStorageInstance.updateInterviewStage.bind(legacyStorageInstance),
    getInterviewStage: legacyStorageInstance.getInterviewStage.bind(legacyStorageInstance),
    deleteInterviewStage: legacyStorageInstance.deleteInterviewStage.bind(legacyStorageInstance),
    deleteInterviewStagesByCandidate: legacyStorageInstance.deleteInterviewStagesByCandidate.bind(legacyStorageInstance),
    getAllInterviewStages: legacyStorageInstance.getAllInterviewStages.bind(legacyStorageInstance),
    getInterviews: legacyStorageInstance.getInterviews.bind(legacyStorageInstance),
    getInterview: legacyStorageInstance.getInterview.bind(legacyStorageInstance),
    updateInterview: legacyStorageInstance.updateInterview.bind(legacyStorageInstance),
    rescheduleInterview: legacyStorageInstance.rescheduleInterview.bind(legacyStorageInstance),
    scheduleInterview: legacyStorageInstance.scheduleInterview.bind(legacyStorageInstance),
    getInterviewsByStage: legacyStorageInstance.getInterviewsByStage.bind(legacyStorageInstance),

    // Analytics operations (legacy - still in storage.ts)
    getConversionFunnel: legacyStorageInstance.getConversionFunnel.bind(legacyStorageInstance),
    getRejectionsByStage: legacyStorageInstance.getRejectionsByStage.bind(legacyStorageInstance),
    getHiredAndDismissedStats: legacyStorageInstance.getHiredAndDismissedStats.bind(legacyStorageInstance),
    getHiredAndDismissedStatsByMonth: legacyStorageInstance.getHiredAndDismissedStatsByMonth.bind(legacyStorageInstance),
    getHiredAndDismissedStatsByYear: legacyStorageInstance.getHiredAndDismissedStatsByYear.bind(legacyStorageInstance),
    getDashboardStatsByMonth: legacyStorageInstance.getDashboardStatsByMonth.bind(legacyStorageInstance),

    // Department operations (legacy - still in storage.ts)
    getDepartments: legacyStorageInstance.getDepartments.bind(legacyStorageInstance),
    createDepartment: legacyStorageInstance.createDepartment.bind(legacyStorageInstance),
    updateDepartment: legacyStorageInstance.updateDepartment.bind(legacyStorageInstance),
    deleteDepartment: legacyStorageInstance.deleteDepartment.bind(legacyStorageInstance),

    // System Settings operations (legacy - use correct method names)
    getSystemSettings: legacyStorageInstance.getSystemSettings.bind(legacyStorageInstance),
    getSystemSetting: legacyStorageInstance.getSystemSetting.bind(legacyStorageInstance),
    setSystemSetting: legacyStorageInstance.setSystemSetting.bind(legacyStorageInstance),

    // Documentation operations (legacy - use correct method names)
    createDocumentationAttachment: legacyStorageInstance.createDocumentationAttachment.bind(legacyStorageInstance),
    getDocumentationAttachments: legacyStorageInstance.getDocumentationAttachments.bind(legacyStorageInstance),
};

// Export individual storage modules for direct access if needed
export {
    workspaceStorage,
    userStorage,
    vacancyStorage,
    superAdminStorage,
    notificationStorage,
    auditStorage,
    messageStorage,
};

export default storage;
