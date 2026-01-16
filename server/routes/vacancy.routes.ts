import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { insertVacancySchemaForAPI } from '@shared/schema';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all vacancies
router.get('/', requireAuth, async (req, res) => {
    try {
        const vacancies = await storage.getVacancies(req.workspaceId);
        res.json(vacancies);
    } catch (error) {
        logger.error('Failed to fetch vacancies', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
});

// Get single vacancy
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid vacancy id' });
        }
        const vacancy = await storage.getVacancy(id, req.workspaceId);

        if (!vacancy) {
            return res.status(404).json({ error: 'Vacancy not found' });
        }

        res.json(vacancy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch vacancy' });
    }
});

// Create vacancy
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const validation = insertVacancySchemaForAPI.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.message });
        }
        // Note: Not using insertVacancySchemaForAPI.parse() because it strips workspaceId
        const vacancyData = {
            title: req.body.title,
            department: req.body.department,
            departmentId: req.body.departmentId || null,
            location: req.body.location || null,
            description: req.body.description || null,
            requirements: req.body.requirements || null,
            status: req.body.status || 'active',
            workspaceId: req.workspaceId!,
            createdBy: req.user!.id,
        };

        const vacancy = await storage.createVacancy(vacancyData);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'CREATE_VACANCY',
            entityType: 'vacancy',
            entityId: vacancy.id,
            newValues: [vacancy],
        });

        broadcastToClients({
            type: 'VACANCY_CREATED',
            data: vacancy,
        });

        res.json(vacancy);
    } catch (error: any) {
        logger.error('Vacancy creation error', { error });
        if (error.errors) {
            logger.error('Validation errors', { errors: error.errors });
            res.status(400).json({ error: 'Validation failed', details: error.errors });
        } else {
            res.status(500).json({ error: 'Failed to create vacancy' });
        }
    }
});

// Update vacancy
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const updates = req.body;

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid vacancy id' });
        }

        const oldVacancy = await storage.getVacancy(id, req.workspaceId);
        const vacancy = await storage.updateVacancy(id, updates);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'UPDATE_VACANCY',
            entityType: 'vacancy',
            entityId: id,
            oldValues: oldVacancy,
            newValues: vacancy,
        });

        broadcastToClients({
            type: 'VACANCY_UPDATED',
            data: vacancy,
        });

        res.json(vacancy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update vacancy' });
    }
});

// Delete vacancy
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid vacancy id' });
        }

        const vacancy = await storage.getVacancy(id, req.workspaceId);
        if (!vacancy) {
            return res.status(404).json({ error: 'Vacancy not found' });
        }

        // SECURITY FIX: Pass workspaceId to prevent deleting vacancies from other workspaces  
        await storage.deleteVacancy(id, req.workspaceId);

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'DELETE_VACANCY',
            entityType: 'vacancy',
            entityId: id,
            oldValues: [vacancy],
        });

        broadcastToClients({
            type: 'VACANCY_DELETED',
            data: { id },
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting vacancy', { error, vacancyId: req.params.id });
        res.status(500).json({ error: 'Failed to delete vacancy' });
    }
});

export default router;
