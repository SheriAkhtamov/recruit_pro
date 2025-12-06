import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { insertCandidateSchemaForAPI } from '@shared/schema';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all candidates
router.get('/', requireAuth, async (req, res) => {
    try {
        const userRole = req.session!.user!.role;
        const userId = req.session!.user!.id;

        let candidates;

        // Admin and HR managers can see all candidates
        if (userRole === 'admin' || userRole === 'manager') {
            candidates = await storage.getCandidates(req.workspaceId);
        } else {
            // Regular employees only see candidates assigned to them for interviews
            candidates = await storage.getCandidatesByInterviewer(userId, req.workspaceId);
        }

        res.json(candidates);
    } catch (error) {
        logger.error('Failed to fetch candidates', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Get candidates assigned to specific interviewer
router.get('/interviewer/:id', requireAuth, async (req, res) => {
    try {
        const interviewerId = parseInt(req.params.id);
        const userId = req.session!.user!.id;

        // Security check: employees can only see their own assigned candidates
        if (req.session!.user!.role !== 'admin' && interviewerId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const candidates = await storage.getCandidatesByInterviewer(interviewerId, req.workspaceId);
        res.json(candidates);
    } catch (error) {
        logger.error('Failed to fetch interviewer candidates', { error, interviewerId: req.session?.user?.id });
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// Get single candidate
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const candidate = await storage.getCandidate(id, req.workspaceId);

        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch candidate' });
    }
});

// Create candidate
router.post('/', requireAuth, upload.array('files', 5), async (req, res) => {
    try {
        const candidateData = insertCandidateSchemaForAPI.parse({
            ...req.body,
            workspaceId: req.workspaceId,
            vacancyId: req.body.vacancyId ? parseInt(req.body.vacancyId) : null,
            createdBy: req.session!.user!.id,
        });

        let resumeUrl = '';
        let resumeFilename = '';
        let parsedResumeData = null;

        // Handle file uploads (take first file as resume if any)
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const files = req.files as Express.Multer.File[];
            const firstFile = files[0];
            resumeUrl = `/api/files/${firstFile.filename}`;
            resumeFilename = firstFile.originalname;
        }

        const candidate = await storage.createCandidate({
            ...candidateData,
            workspaceId: req.workspaceId!,
            resumeUrl,
            resumeFilename,
            parsedResumeData,
        });

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'CREATE_CANDIDATE',
            entityType: 'candidate',
            entityId: candidate.id,
            newValues: [candidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_CREATED',
            data: candidate,
        });

        res.json(candidate);
    } catch (error) {
        logger.error('Error creating candidate', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to create candidate' });
    }
});

// Update candidate
router.put('/:id', requireAuth, upload.array('files', 5), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const oldCandidate = await storage.getCandidate(id, req.workspaceId);
        if (!oldCandidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Process form data - only include fields that are provided
        const updates: any = {};

        if (req.body.fullName) updates.fullName = req.body.fullName;
        if (req.body.email) updates.email = req.body.email;
        if (req.body.phone) updates.phone = req.body.phone;
        if (req.body.city) updates.city = req.body.city;
        if (req.body.source) updates.source = req.body.source;
        if (req.body.notes) updates.notes = req.body.notes;

        // Handle status updates (like rejection)
        if (req.body.status) updates.status = req.body.status;
        if (req.body.rejectionReason) updates.rejectionReason = req.body.rejectionReason;
        if (req.body.rejectionStage !== undefined) updates.rejectionStage = parseInt(req.body.rejectionStage);

        // Handle vacancy ID
        if (req.body.vacancyId && req.body.vacancyId !== '') {
            const parsedVacancyId = parseInt(req.body.vacancyId);
            if (!isNaN(parsedVacancyId)) {
                updates.vacancyId = parsedVacancyId;
            }
        }

        // Handle file uploads if any
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const files = req.files as Express.Multer.File[];
            const firstFile = files[0];
            updates.resumeUrl = `/api/files/${firstFile.filename}`;
        }

        // Handle interview stage chain updates
        if (req.body.interviewStageChain) {
            try {
                const newStageChain = JSON.parse(req.body.interviewStageChain);

                // Sync stages safely (preserving history)
                await storage.syncInterviewStages(id, newStageChain);

                updates.interviewStageChain = newStageChain;
            } catch (parseError) {
                logger.error('Error parsing interview stage chain', { error: parseError, candidateId: id });
                return res.status(400).json({ error: 'Invalid interview stage chain format' });
            }
        }

        const candidate = await storage.updateCandidate(id, updates);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'UPDATE_CANDIDATE',
            entityType: 'candidate',
            entityId: id,
            oldValues: [oldCandidate],
            newValues: [candidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_UPDATED',
            data: candidate,
        });

        res.json(candidate);
    } catch (error) {
        logger.error('Error updating candidate', { error, candidateId: req.params.id });
        res.status(500).json({ error: 'Failed to update candidate' });
    }
});

// Delete candidate
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const candidate = await storage.getCandidate(id, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // SECURITY FIX: Pass workspaceId to prevent deleting candidates from other workspaces
        await storage.deleteCandidate(id, req.workspaceId!);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'DELETE_CANDIDATE',
            entityType: 'candidate',
            entityId: id,
            oldValues: [candidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_DELETED',
            data: { id },
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting candidate', { error, candidateId: req.params.id });
        res.status(500).json({ error: 'Failed to delete candidate' });
    }
});

// Hire candidate
router.put('/:id/hire', requireAuth, async (req, res) => {
    try {
        const candidateId = parseInt(req.params.id);
        const { salary, startDate, position } = req.body;

        const candidate = await storage.getCandidate(candidateId, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Note: salary, startDate, hiredPosition fields not in schema
        // If needed, add these columns to candidates table via migration
        const hiredCandidate = await storage.updateCandidate(candidateId, {
            status: 'hired',
        });

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'HIRE_CANDIDATE',
            entityType: 'candidate',
            entityId: candidateId,
            oldValues: [candidate],
            newValues: [hiredCandidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_HIRED',
            data: hiredCandidate,
        });

        res.json(hiredCandidate);
    } catch (error) {
        logger.error('Error hiring candidate', { error, candidateId: req.params.id });
        res.status(500).json({ error: 'Failed to hire candidate' });
    }
});

// Dismiss candidate
router.put('/:id/dismiss', requireAuth, async (req, res) => {
    try {
        const candidateId = parseInt(req.params.id);
        const { dismissalReason, dismissalDate } = req.body;

        const candidate = await storage.getCandidate(candidateId, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        if (candidate.status !== 'hired') {
            return res.status(400).json({ error: 'Only hired candidates can be dismissed' });
        }

        const dismissedCandidate = await storage.updateCandidate(candidateId, {
            status: 'dismissed',
            dismissalReason: dismissalReason || null,
            dismissalDate: dismissalDate || new Date(),
        });

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'DISMISS_CANDIDATE',
            entityType: 'candidate',
            entityId: candidateId,
            oldValues: [candidate],
            newValues: [dismissedCandidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_DISMISSED',
            data: dismissedCandidate,
        });

        res.json(dismissedCandidate);
    } catch (error) {
        logger.error('Error dismissing candidate', { error, candidateId: req.params.id });
        res.status(500).json({ error: 'Failed to dismiss candidate' });
    }
});

// Move candidate to documentation after passing all interviews
router.put('/:id/move-to-documentation', requireAuth, async (req, res) => {
    try {
        const candidateId = parseInt(req.params.id);

        const candidate = await storage.getCandidate(candidateId, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        if (candidate.status !== 'active') {
            return res.status(400).json({ error: 'Candidate is not in active status' });
        }

        // Verify all interview stages are completed successfully
        const stages = await storage.getInterviewStagesByCandidate(candidateId);

        if (stages.length === 0) {
            return res.status(400).json({ error: 'Candidate has no interview stages defined' });
        }

        const allPassed = stages.every(stage => stage.status === 'passed');

        if (!allPassed) {
            return res.status(400).json({ error: 'Not all interview stages have been passed' });
        }

        // Update candidate status to documentation
        const updatedCandidate = await storage.updateCandidate(candidateId, {
            status: 'documentation'
        });

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'MOVE_TO_DOCUMENTATION',
            entityType: 'candidate',
            entityId: candidateId,
            oldValues: [candidate],
            newValues: [updatedCandidate],
        });

        broadcastToClients({
            type: 'CANDIDATE_MOVED_TO_DOCUMENTATION',
            data: updatedCandidate,
        });

        res.json(updatedCandidate);
    } catch (error) {
        logger.error('Error moving candidate to documentation', { error, candidateId: req.params.id });
        res.status(500).json({ error: 'Failed to move candidate to documentation' });
    }
});

export default router;
