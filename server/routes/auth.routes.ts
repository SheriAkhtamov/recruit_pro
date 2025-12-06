import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import { authService } from '../services/auth';
import { superAuthService } from '../services/superAuth';
import { devLog } from '../lib/logger';
import { t } from '../lib/i18n';

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
        const { email, password, workspaceId } = req.body;

        // If workspaceId is provided, authenticate within that workspace
        const user = await authService.authenticateUser(email, password, workspaceId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set user in session
        const sanitizedUser = authService.sanitizeUser(user) as any;
        req.session.user = sanitizedUser;
        req.session.superAdmin = undefined; // Clear super admin session

        // Force session save with explicit callback
        req.session.save((err: Error | null) => {
            if (err) {
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({ user: req.session.user });
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

router.get('/me', (req, res) => {
    if (req.session?.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Super Admin Authentication
router.post('/super-admin/login', superAdminLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        const superAdmin = await superAuthService.authenticateSuperAdmin(username, password);

        if (!superAdmin) {
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // Clear any existing user session
        req.session.user = undefined;

        // Set super admin in session
        const sanitizedSuperAdmin = superAuthService.sanitizeSuperAdmin(superAdmin);
        req.session.superAdmin = sanitizedSuperAdmin;

        // Force session save
        req.session.save((err: Error | null) => {
            if (err) {
                return res.status(500).json({ error: 'Session save failed' });
            }

            res.json({ superAdmin: req.session.superAdmin });
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

router.get('/super-admin/me', (req, res) => {
    if (req.session?.superAdmin) {
        res.json({ superAdmin: req.session.superAdmin });
    } else {
        res.status(401).json({ error: 'Not authenticated as super admin' });
    }
});

export default router;
