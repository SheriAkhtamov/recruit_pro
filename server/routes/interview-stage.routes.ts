import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { insertInterviewStageSchema } from '@shared/schema';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all interview stages
router.get('/', requireAuth, async (req, res) => {
    try {
        const stages = await storage.getAllInterviewStages(req.workspaceId);
        res.json(stages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
});

// Get interview stages by candidate
router.get('/candidate/:id', requireAuth, async (req, res) => {
    try {
        const candidateId = parseInt(req.params.id);
        if (isNaN(candidateId)) {
            return res.status(400).json({ error: 'Invalid candidate ID' });
        }
        const stages = await storage.getInterviewStagesByCandidate(candidateId, req.workspaceId);
        res.json(stages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interview stages for candidate' });
    }
});

// Create interview stage
router.post('/', requireAuth, async (req, res) => {
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
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        // If marking as passed or failed, require feedback
        if ((updates.status === 'passed' || updates.status === 'failed') &&
            (!updates.comments || updates.comments.trim() === '')) {
            return res.status(400).json({ error: 'Feedback is required when completing interview stages' });
        }

        const stage = await storage.updateInterviewStage(id, updates, req.workspaceId);

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
        logger.error('Error updating interview stage:', error);
        res.status(500).json({ error: 'Failed to update interview stage' });
    }
});

// Update interview stage comments (specific endpoint for feedback updates)
router.put('/:id/comments', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { comments } = req.body;

        if (comments === undefined) {
            return res.status(400).json({ error: 'Comments are required' });
        }

        const stage = await storage.updateInterviewStage(id, { comments }, req.workspaceId);

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
        logger.error('Error updating interview stage comments:', error);
        res.status(500).json({ error: 'Failed to update interview stage comments' });
    }
});

// Delete interview stage
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        // Using any cast because deleteInterviewStage might be missing from IStorage interface definition 
        // but present in implementation, or I missed it.
        if ((storage as any).deleteInterviewStage) {
            await (storage as any).deleteInterviewStage(id);
        } else {
            // Fallback or error if method doesn't exist
            logger.error('deleteInterviewStage method missing on storage');
            return res.status(500).json({ error: 'Method not implemented' });
        }

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
