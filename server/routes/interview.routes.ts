import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { insertInterviewStageSchema, insertInterviewSchema } from '@shared/schema';
import { emailService } from '../services/email';

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
        const interview = await storage.getInterview(id);

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

        if (interviewer && stage) {
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
            userId: req.session!.user!.id,
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
        console.error('Schedule interview error:', error);
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
            oldInterview = await storage.getInterview(id);
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
                title: 'Собеседование перенесено',
                message: `Собеседование с ${candidate?.fullName || 'кандидатом'} перенесено на ${new Date(updates.scheduledAt).toLocaleString('ru-RU')}`,
                relatedEntityType: 'interview',
                relatedEntityId: interview.id,
                isRead: false,
            });
        }

        await storage.createAuditLog({
            userId: req.session!.user!.id,
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
        console.error('Update interview error:', error);
        res.status(500).json({ error: 'Failed to update interview' });
    }
});

// Get all interview stages for dashboard
router.get('/stages/all', requireAuth, async (req, res) => {
    try {
        const stages = await storage.getAllInterviewStages();
        res.json(stages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
});

// Create interview stage
router.post('/stages', requireAuth, async (req, res) => {
    try {
        const stageData = insertInterviewStageSchema.parse(req.body);
        const stage = await storage.createInterviewStage(stageData);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'CREATE_INTERVIEW_STAGE',
            entityType: 'interview_stage',
            entityId: stage.id,
            newValues: [stage],
        });

        res.json(stage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create interview stage' });
    }
});

// Update interview stage
router.put('/stages/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        // If marking as passed or failed, require feedback
        if ((updates.status === 'passed' || updates.status === 'failed') &&
            (!updates.comments || updates.comments.trim() === '')) {
            return res.status(400).json({ error: 'Feedback is required when completing interview stages' });
        }

        const stage = await storage.updateInterviewStage(id, updates);

        // Also update any related interview records
        const relatedInterviews = await storage.getInterviewsByStage(id);
        if (relatedInterviews.length > 0) {
            const interviewOutcome = updates.status === 'passed' ? 'passed' :
                updates.status === 'failed' ? 'failed' : null;

            if (interviewOutcome) {
                for (const interview of relatedInterviews) {
                    await storage.updateInterview(interview.id, {
                        outcome: interviewOutcome,
                        status: 'completed',
                        notes: updates.comments || '',
                    });
                }
            }
        }

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'UPDATE_INTERVIEW_STAGE',
            entityType: 'interview_stage',
            entityId: id,
            newValues: [stage],
        });

        broadcastToClients({
            type: 'INTERVIEW_STAGE_UPDATED',
            data: stage,
        });

        res.json(stage);
    } catch (error) {
        console.error('Error updating interview stage:', error);
        res.status(500).json({ error: 'Failed to update interview stage' });
    }
});

// Delete interview stage
router.delete('/stages/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await storage.deleteInterviewStage(id);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'DELETE_INTERVIEW_STAGE',
            entityType: 'interview_stage',
            entityId: id,
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete interview stage' });
    }
});

export default router;
