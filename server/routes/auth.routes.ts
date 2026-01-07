import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth';
import { superAuthService } from '../services/superAuth';
import { t } from '../lib/i18n';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Rate limiting configurations
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per window
    message: t('tooManyLoginAttempts'),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});

const superAdminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 super admin login attempts
    message: t('tooManySuperAdminLoginAttempts'),
    standardHeaders: true,
    legacyHeaders: false,
});

// Regular user authentication
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { login, email, password, workspaceId } = req.body;
        const loginOrEmail = login || email;

        if (!loginOrEmail) {
            return res.status(400).json({ error: 'Login is required' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        // If workspaceId is provided, authenticate within that workspace
        const user = await authService.authenticateUser(loginOrEmail, password, workspaceId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set user in session
        const sanitizedUser = authService.sanitizeUser(user) as any;
        req.session.userId = sanitizedUser.id;
        req.session.workspaceId = sanitizedUser.workspaceId;
        req.session.superAdminId = undefined;
        req.session.isSuperAdminView = false;

        // Force session save with explicit callback
        req.session.save((err: Error | null) => {
            if (err) {
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({ user: sanitizedUser });
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

router.get('/me', requireAuth, (req, res) => {
    res.json({ user: authService.sanitizeUser(req.user!) });
});

// Super Admin Authentication
router.post('/super-admin/login', superAdminLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const superAdmin = await superAuthService.authenticateSuperAdmin(username, password);

        if (!superAdmin) {
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // Clear any existing user session
        req.session.userId = undefined;
        req.session.workspaceId = undefined;
        req.session.isSuperAdminView = false;

        // Set super admin in session
        const sanitizedSuperAdmin = superAuthService.sanitizeSuperAdmin(superAdmin);
        req.session.superAdminId = sanitizedSuperAdmin.id;

        // Force session save
        req.session.save((err: Error | null) => {
            if (err) {
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({ superAdmin: sanitizedSuperAdmin });
        });
    } catch (error) {
        res.status(500).json({ error: 'Super admin login failed' });
    }
});

router.post('/super-admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

router.get('/super-admin/me', requireSuperAdmin, (req, res) => {
    res.json({ superAdmin: superAuthService.sanitizeSuperAdmin(req.superAdmin!) });
});

export default router;
