import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { insertVacancySchemaForAPI } from '@shared/schema';

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
        console.error('Failed to fetch vacancies:', error);
        res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
});

// Get single vacancy
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
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
router.post('/', requireAuth, async (req, res) => {
    try {
        const vacancyData = insertVacancySchemaForAPI.parse({
            ...req.body,
            workspaceId: req.workspaceId,
            createdBy: req.session!.user!.id,
        });

        const vacancy = await storage.createVacancy(vacancyData);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
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
        console.error('Vacancy creation error:', error);
        if (error.errors) {
            console.error('Validation errors:', error.errors);
            res.status(400).json({ error: 'Validation failed', details: error.errors });
        } else {
            res.status(500).json({ error: 'Failed to create vacancy' });
        }
    }
});

// Update vacancy
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updates = req.body;

        const oldVacancy = await storage.getVacancy(id, req.workspaceId);
        const vacancy = await storage.updateVacancy(id, updates);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
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
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const vacancy = await storage.getVacancy(id, req.workspaceId);
        if (!vacancy) {
            return res.status(404).json({ error: 'Vacancy not found' });
        }

        await storage.deleteVacancy(id);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
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
        console.error('Error deleting vacancy:', error);
        res.status(500).json({ error: 'Failed to delete vacancy' });
    }
});

export default router;
