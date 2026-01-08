import { Router } from 'express';
import { storage } from '../storage';
import { requireSuperAdmin } from '../middleware/auth.middleware';
import { logger } from '../lib/logger';
import { superAuthService } from '../services/superAuth';
import { authService } from '../services/auth';

const router = Router();

// Get all workspaces
router.get('/workspaces', requireSuperAdmin, async (req, res) => {
    try {
        const superAdmin = superAuthService.sanitizeSuperAdmin(req.superAdmin!);
        logger.info('Super admin fetched workspaces', { superAdminId: superAdmin.id });
        const workspaces = await storage.getWorkspaces();
        res.json(workspaces);
    } catch (error) {
        logger.error('Error fetching workspaces', { error });
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});

// Create new workspace
router.post('/workspaces', requireSuperAdmin, async (req, res) => {
    try {
        const { companyName, adminEmail, adminFullName, adminPassword } = req.body;

        if (!companyName || !adminEmail || !adminFullName || !adminPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create workspace (using 'name' not 'companyName' per schema)
        const workspace = await storage.createWorkspace({ name: companyName });

        // Create admin user for the workspace
        const hashedPassword = await authService.hashPassword(adminPassword);
        const adminUser = await authService.createUser({
            workspaceId: workspace.id,
            email: adminEmail,
            password: hashedPassword,
            fullName: adminFullName,
            role: 'admin',
            isActive: true,
            hasReportAccess: true,
        });

        res.json({ workspace, adminUser: authService.sanitizeUser(adminUser) });
    } catch (error) {
        logger.error('Error creating workspace', { error });
        res.status(500).json({ error: 'Failed to create workspace' });
    }
});

// Get single workspace
router.get('/workspaces/:id', requireSuperAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const workspace = await storage.getWorkspace(id);

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        res.json(workspace);
    } catch (error) {
        logger.error('Error fetching workspace', { error, workspaceId: req.params.id });
        res.status(500).json({ error: 'Failed to fetch workspace' });
    }
});

// Update workspace
router.put('/workspaces/:id', requireSuperAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { companyName, isActive } = req.body;

        const updates: any = {};
        if (companyName) updates.companyName = companyName;
        if (isActive !== undefined) updates.isActive = isActive;

        const workspace = await storage.updateWorkspace(id, updates);
        res.json(workspace);
    } catch (error) {
        logger.error('Error updating workspace', { error, workspaceId: req.params.id });
        res.status(500).json({ error: 'Failed to update workspace' });
    }
});

// Delete workspace
router.delete('/workspaces/:id', requireSuperAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await storage.deleteWorkspace(id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error deleting workspace', { error, workspaceId: req.params.id });
        res.status(500).json({ error: 'Failed to delete workspace' });
    }
});

// Get workspace admin user
router.get('/workspaces/:id/admin', requireSuperAdmin, async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.id);
        const adminUser = await storage.getWorkspaceAdminUser(workspaceId);

        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found for this workspace' });
        }

        res.json(adminUser);
    } catch (error) {
        logger.error('Error fetching workspace admin', { error, workspaceId: req.params.id });
        res.status(500).json({ error: 'Failed to fetch workspace admin' });
    }
});

// Update workspace admin user
router.put('/workspaces/:id/admin', requireSuperAdmin, async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.id);
        const { email, fullName, password } = req.body;

        const adminUser = await storage.getWorkspaceAdminUser(workspaceId);
        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found for this workspace' });
        }

        const updates: any = {};
        if (email) updates.email = email;
        if (fullName) updates.fullName = fullName;
        if (password) {
            updates.password = await authService.hashPassword(password);
        }

        const updatedUser = await storage.updateUser(adminUser.id, updates);
        res.json(updatedUser);
    } catch (error) {
        logger.error('Error updating workspace admin', { error, workspaceId: req.params.id });
        res.status(500).json({ error: 'Failed to update workspace admin' });
    }
});

// Super admin login as workspace admin (view mode)
router.post('/login-as-admin/:workspaceId', requireSuperAdmin, async (req, res) => {
    try {
        const workspaceId = parseInt(req.params.workspaceId);

        // Get admin user for this workspace
        const adminUser = await storage.getWorkspaceAdminUser(workspaceId);

        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found for this workspace' });
        }

        // Create a special session for super admin viewing a workspace
        const sanitizedUser = authService.sanitizeUser(adminUser) as any;

        // Set user in session
        req.session.userId = sanitizedUser.id;
        req.session.workspaceId = sanitizedUser.workspaceId;
        req.session.isSuperAdminView = true;

        req.session.save((err: Error | null) => {
            if (err) {
                logger.error('Session save error', { error: err });
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({ user: sanitizedUser });
        });
    } catch (error) {
        logger.error('Error logging in as admin', { error, workspaceId: req.params.workspaceId });
        res.status(500).json({ error: 'Failed to login as admin' });
    }
});

export default router;
