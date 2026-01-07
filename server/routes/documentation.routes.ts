import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { documentationUpload } from '../middleware/upload.middleware';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all documentation candidates
router.get('/candidates', requireAuth, async (req, res) => {
    try {
        const workspaceId = req.workspaceId;
        const candidates = await storage.getCandidatesByStatus('documentation', workspaceId);
        res.json(candidates);
    } catch (error) {
        logger.error('Failed to fetch documentation candidates:', error);
        res.status(500).json({ error: 'Failed to fetch documentation candidates' });
    }
});

// Create manual documentation candidate
router.post('/candidates', requireAuth, documentationUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
]), async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.fullName) {
            return res.status(400).json({ error: 'Full name is required' });
        }

        if (!req.body.vacancyId) {
            return res.status(400).json({ error: 'Vacancy is required' });
        }

        let photoUrl = '';
        const documentUrls: string[] = [];

        if (req.files && typeof req.files === 'object') {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            // Handle photo
            if (files.photo && files.photo.length > 0) {
                photoUrl = `/api/files/photos/${files.photo[0].filename}`;
            }

            // Handle documents
            if (files.documents && files.documents.length > 0) {
                for (const doc of files.documents) {
                    documentUrls.push(`/api/files/${doc.filename}`);
                }
            }
        }

        const candidateData = {
            workspaceId: req.workspaceId!,
            fullName: req.body.fullName,
            email: req.body.email || null,
            phone: req.body.phone || null,
            city: req.body.city || null,
            notes: req.body.notes || null,
            vacancyId: parseInt(req.body.vacancyId),
            status: 'documentation',
            source: 'manual_documentation',
            createdBy: req.user!.id,
            photoUrl,
        };

        const candidate = await storage.createCandidate(candidateData);

        // Store document URLs as documentation attachments
        if (documentUrls.length > 0) {
            for (const docUrl of documentUrls) {
                await storage.createDocumentationAttachment({
                    candidateId: candidate.id,
                    filename: docUrl.split('/').pop() || 'document', // Changed from fileName to filename
                    originalName: docUrl.split('/').pop() || 'document',
                    fileType: 'document',
                    uploadedBy: req.user!.id,
                });
            }
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'CREATE_DOCUMENTATION_CANDIDATE',
            entityType: 'candidate',
            entityId: candidate.id,
            newValues: [candidate],
        });

        broadcastToClients({
            type: 'DOCUMENTATION_CANDIDATE_CREATED',
            data: candidate,
        });

        res.json(candidate);
    } catch (error) {
        logger.error('Error creating documentation candidate:', error);
        res.status(500).json({ error: 'Failed to create documentation candidate' });
    }
});

// Update documentation candidate
router.put('/candidates/:id', requireAuth, documentationUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
]), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const candidate = await storage.getCandidate(id, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        if (candidate.status !== 'documentation') {
            return res.status(400).json({ error: 'Candidate is not in documentation status' });
        }

        const updates: any = {};

        if (req.body.fullName) updates.fullName = req.body.fullName;
        if (req.body.email) updates.email = req.body.email;
        if (req.body.phone) updates.phone = req.body.phone;
        if (req.body.city) updates.city = req.body.city;
        if (req.body.notes) updates.notes = req.body.notes;

        // Handle new file uploads
        if (req.files && typeof req.files === 'object') {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            // Handle photo
            if (files.photo && files.photo.length > 0) {
                updates.photoUrl = `/api/files/photos/${files.photo[0].filename}`;
            }

            // Handle documents
            if (files.documents && files.documents.length > 0) {
                for (const doc of files.documents) {
                    await storage.createDocumentationAttachment({
                        candidateId: id,
                        filename: doc.filename, // Changed from fileName
                        originalName: doc.originalname,
                        fileType: 'document',
                        uploadedBy: req.user!.id,
                    });
                }
            }
        }

        const updatedCandidate = await storage.updateCandidate(id, updates);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'UPDATE_DOCUMENTATION_CANDIDATE',
            entityType: 'candidate',
            entityId: id,
            oldValues: [candidate],
            newValues: [updatedCandidate],
        });

        broadcastToClients({
            type: 'DOCUMENTATION_CANDIDATE_UPDATED',
            data: updatedCandidate,
        });

        res.json(updatedCandidate);
    } catch (error) {
        logger.error('Error updating documentation candidate:', error);
        res.status(500).json({ error: 'Failed to update documentation candidate' });
    }
});

// Complete documentation and move to hired
router.put('/candidates/:id/complete', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { salary, startDate, position } = req.body;

        const candidate = await storage.getCandidate(id, req.workspaceId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        if (candidate.status !== 'documentation') {
            return res.status(400).json({ error: 'Candidate is not in documentation status' });
        }

        // Note: salary, startDate, hiredPosition fields not in candidates schema
        const hiredCandidate = await storage.updateCandidate(id, {
            status: 'hired',
        });

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'COMPLETE_DOCUMENTATION',
            entityType: 'candidate',
            entityId: id,
            oldValues: [candidate],
            newValues: [hiredCandidate],
        });

        broadcastToClients({
            type: 'DOCUMENTATION_COMPLETED',
            data: hiredCandidate,
        });

        res.json(hiredCandidate);
    } catch (error) {
        logger.error('Error completing documentation:', error);
        res.status(500).json({ error: 'Failed to complete documentation' });
    }
});

export default router;
