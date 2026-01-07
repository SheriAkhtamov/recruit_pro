import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { emailService } from '../services/email';
import { t } from '../lib/i18n';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all interviews
router.get('/', requireAuth, async (req, res) => {
    try {
        const interviews = await storage.getInterviews(req.workspaceId);
        res.json(interviews);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interviews' });
    }
});

// Get single interview
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const interview = await storage.getInterview(id, req.workspaceId);

        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interview' });
    }
});

// Schedule interview
router.post('/', requireAuth, async (req, res) => {
    try {
        const { stageId, interviewerId, scheduledAt, duration } = req.body;

        if (!stageId || !interviewerId || !scheduledAt) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const interview = await storage.scheduleInterview(
            parseInt(stageId),
            parseInt(interviewerId),
            scheduledAt,
            parseInt(duration) || 60
        );

        // Send notification email to interviewer
        const interviewer = await storage.getUser(parseInt(interviewerId), req.workspaceId);
        const stage = await storage.getInterviewStage(parseInt(stageId));

        if (interviewer && stage && stage.candidateId) {
            const candidate = await storage.getCandidate(stage.candidateId, req.workspaceId);

            if (candidate) {
                await emailService.sendInterviewNotification(
                    interviewer.email,
                    candidate.fullName,
                    new Date(scheduledAt),
                    interviewer.fullName
                );
            }
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'SCHEDULE_INTERVIEW',
            entityType: 'interview',
            entityId: interview.id,
            newValues: [interview],
        });

        broadcastToClients({
            type: 'INTERVIEW_SCHEDULED',
            data: interview,
        });

        res.json(interview);
    } catch (error) {
        logger.error('Schedule interview error', { error, stageId: req.body.stageId, interviewerId: req.body.interviewerId, scheduledAt: req.body.scheduledAt });
        res.status(500).json({ error: 'Failed to schedule interview' });
    }
});

// Update interview
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        // Check if this is a reschedule operation
        const isReschedule = updates.scheduledAt && updates.scheduledAt !== '';
        let oldInterview = null;

        if (isReschedule) {
            // Get the interview details before updating for comparison
            oldInterview = await storage.getInterview(id, req.workspaceId);
        }

        const interview = await storage.updateInterview(id, updates);

        // Handle reschedule notifications
        if (isReschedule && oldInterview) {
            // Get candidate and interviewer details for notifications
            const candidate = await storage.getCandidate(oldInterview.candidateId, req.workspaceId);
            const interviewer = await storage.getUser(oldInterview.interviewerId, req.workspaceId);

            // Create in-app notification for interviewer
            await storage.createNotification({
                userId: oldInterview.interviewerId,
                type: 'interview_rescheduled',
                title: t('interviewRescheduled'),
                message: t('interviewWithCandidateRescheduled', 'ru', {
                    candidateName: candidate?.fullName || t('candidateName'),
                    date: new Date(updates.scheduledAt).toLocaleString('ru-RU')
                }),
                relatedEntityType: 'interview',
                relatedEntityId: interview.id,
                isRead: false,
            });
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: isReschedule ? 'RESCHEDULE_INTERVIEW' : 'UPDATE_INTERVIEW',
            entityType: 'interview',
            entityId: id,
            newValues: [interview],
        });

        broadcastToClients({
            type: isReschedule ? 'INTERVIEW_RESCHEDULED' : 'INTERVIEW_UPDATED',
            data: interview,
        });

        res.json(interview);
    } catch (error) {
        logger.error('Update interview error', { error, interviewId: req.params.id });
        res.status(500).json({ error: 'Failed to update interview' });
    }
});

// Reschedule interview (specific endpoint)
router.put('/:id/reschedule', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { newDateTime } = req.body;

        if (!newDateTime) {
            return res.status(400).json({ error: 'New date/time is required' });
        }

        const oldInterview = await storage.getInterview(id, req.workspaceId);
        const interview = await storage.rescheduleInterview(id, new Date(newDateTime));

        if (oldInterview) {
            const candidate = await storage.getCandidate(oldInterview.candidateId, req.workspaceId);

            await storage.createNotification({
                userId: oldInterview.interviewerId,
                type: 'interview_rescheduled',
                title: t('interviewRescheduled'),
                message: t('interviewWithCandidateRescheduled', 'ru', {
                    candidateName: candidate?.fullName || t('candidateName'),
                    date: new Date(newDateTime).toLocaleString('ru-RU')
                }),
                relatedEntityType: 'interview',
                relatedEntityId: interview.id,
                isRead: false,
            });
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'RESCHEDULE_INTERVIEW',
            entityType: 'interview',
            entityId: id,
            newValues: [interview],
        });

        broadcastToClients({
            type: 'INTERVIEW_RESCHEDULED',
            data: interview,
        });

        res.json(interview);
    } catch (error) {
        logger.error('Reschedule interview error', { error, interviewId: req.params.id });
        res.status(500).json({ error: 'Failed to reschedule interview' });
    }
});

export default router;
