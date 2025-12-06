import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { logger } from '../lib/logger';

const router = Router();

// Get all departments
router.get('/', requireAuth, async (req, res) => {
    try {
        const departments = await storage.getDepartments(req.workspaceId);
        res.json(departments);
    } catch (error) {
        logger.error('Failed to fetch departments', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create department
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Department name is required' });
        }

        // Check if department already exists in this workspace
        const existingDepartments = await storage.getDepartments(req.workspaceId);
        const nameExists = existingDepartments.some(d => d.name.toLowerCase() === name.toLowerCase());

        if (nameExists) {
            return res.status(409).json({ error: 'Department with this name already exists' });
        }

        const department = await storage.createDepartment({
            name,
            description,
            workspaceId: req.workspaceId!,
        });

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'CREATE_DEPARTMENT',
            entityType: 'department',
            entityId: department.id,
            newValues: [department],
        });

        res.status(201).json(department);
    } catch (error) {
        logger.error('Failed to create department', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Update department
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        const { name, description } = req.body;

        const oldDepartment = await storage.getDepartment(departmentId, req.workspaceId);
        if (!oldDepartment) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const updatedDepartment = await storage.updateDepartment(departmentId, {
            name,
            description,
        }, req.workspaceId);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'UPDATE_DEPARTMENT',
            entityType: 'department',
            entityId: departmentId,
            oldValues: [oldDepartment],
            newValues: [updatedDepartment],
        });

        res.json(updatedDepartment);
    } catch (error) {
        logger.error('Failed to update department', { error, departmentId: req.params.id });
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete department
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);

        const department = await storage.getDepartment(departmentId, req.workspaceId);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        await storage.deleteDepartment(departmentId, req.workspaceId);

        await storage.createAuditLog({
            userId: req.session!.user!.id,
            action: 'DELETE_DEPARTMENT',
            entityType: 'department',
            entityId: departmentId,
            oldValues: [department],
        });

        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        logger.error('Failed to delete department', { error, departmentId: req.params.id });
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

export default router;
