import { Router } from 'express';
import { storage } from '../storage';
import { authService } from '../services/auth';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { emailService } from '../services/email';
import { logger } from '../lib/logger';

const router = Router();

// Get all users in workspace
router.get('/', requireAuth, async (req, res) => {
    try {
        const users = await storage.getUsers(req.workspaceId);
        const sanitizedUsers = users.map(u => authService.sanitizeUser(u));
        res.json(sanitizedUsers);
    } catch (error) {
        logger.error('Error fetching users', { error, workspaceId: req.workspaceId });
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new user
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { email, fullName, phone, position, role, hasReportAccess, isActive } = req.body;
        const workspaceId = req.workspaceId;

        // Check if user already exists
        const existingUsers = await storage.getUsers(workspaceId);
        const userExists = existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase());

        if (userExists) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Generate temporary password
        const temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await authService.hashPassword(temporaryPassword);

        const newUser = await authService.createUser({
            workspaceId: workspaceId!,  // Non-null assertion since requireAuth guarantees this
            email,
            password: hashedPassword,
            fullName,
            phone: phone || null,
            position: position || null,
            role: role || 'employee',
            hasReportAccess: hasReportAccess || false,
            isActive: isActive !== undefined ? isActive : true,
        });

        // Send welcome email with credentials
        try {
            await emailService.sendWelcomeEmail(email, fullName, temporaryPassword);
        } catch (emailError) {
            logger.error('Failed to send welcome email', { error: emailError, userId: newUser.id });
            // Continue even if email fails
        }

        await storage.createAuditLog({
            userId: req.user!.id,
            action: 'CREATE_USER',
            entityType: 'user',
            entityId: newUser.id,
            newValues: [authService.sanitizeUser(newUser)],
        });

        res.json(authService.sanitizeUser(newUser));
    } catch (error: any) {
        logger.error('Error creating user', { error, workspaceId: req.workspaceId });
        if (error.code === '23505' && error.constraint === 'users_email_unique') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Get user credentials (admin only)
router.get('/:id/credentials', requireAdmin, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const workspaceId = req.workspaceId;
        const user = await storage.getUserWithPassword(id, workspaceId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            email: user.email,
            role: user.role,
            workspaceId: user.workspaceId
        });
    } catch (error) {
        logger.error('Error fetching user credentials', { error, userId: req.params.id });
        res.status(500).json({ error: 'Failed to fetch credentials' });
    }
});

// Update user
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        const currentUser = req.user;

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Users can only update their own profile, unless they're admin
        if (currentUser?.id !== id && currentUser?.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot update other users profile' });
        }

        const existingUser = await storage.getUser(id, req.workspaceId);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prepare update data
        const updateData = {
            fullName: req.body.fullName,
            email: req.body.email,
            position: req.body.position,
            phone: req.body.phone || null,
            location: req.body.location || null,
            role: req.body.role,
        };

        // Only admins can change roles and hasReportAccess
        if (currentUser?.role !== 'admin') {
            updateData.role = existingUser.role;
        } else {
            // Admin can update hasReportAccess for other users
            if (req.body.hasReportAccess !== undefined) {
                (updateData as any).hasReportAccess = Boolean(req.body.hasReportAccess);
            }
        }

        const updatedUser = await storage.updateUser(id, updateData);

        res.json(authService.sanitizeUser(updatedUser));
    } catch (error) {
        logger.error('Error updating user', { error, userId: req.params.id });
        if ((error as any).code === '23505' && (error as any).constraint === 'users_email_unique') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const id = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check if user exists
        const user = await storage.getUser(id, req.workspaceId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deletion of the main admin account (first admin in workspace)
        const allAdmins = await storage.getUsers(req.workspaceId);
        const adminUsers = allAdmins.filter((u: any) => u.role === 'admin');
        const firstAdmin = adminUsers.sort((a: any, b: any) => a.id - b.id)[0];

        if (firstAdmin && user.id === firstAdmin.id) {
            return res.status(403).json({ error: 'Cannot delete the primary administrator account. Transfer admin role to another user first.' });
        }

        // Only admins can delete other users
        if (req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Only administrators can delete users' });
        }

        await storage.deleteUser(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        logger.error('Error deleting user', { error, userId: req.params.id });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
