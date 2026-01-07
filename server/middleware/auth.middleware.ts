import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { logger } from '../lib/logger';

const hasPermission = (user: any, permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'hr_manager' && permission === 'view_reports') return user.hasReportAccess;
    return false;
};

// Authentication middleware - loads user and adds workspaceId to request
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await storage.getUser(req.session.userId, req.session.workspaceId);
        if (!user || !user.isActive) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: 'Invalid or inactive user' });
        }

        req.user = user;
        req.workspaceId = user.workspaceId;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        if (req.session?.isSuperAdminView && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return res.status(403).json({
                error: 'Read-only mode',
                message: 'Modifications are not allowed in view-only mode'
            });
        }

        next();
    });
};

export const requireAnalyticsAccess = async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
        const user = req.user;
        if (user?.role === 'admin' || Boolean(user?.hasReportAccess)) {
            next();
        } else {
            return res.status(403).json({ error: 'Analytics access not allowed. Contact administrator to enable report access.' });
        }
    });
};

// Super Admin workspace management routes
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session?.superAdminId) {
            return res.status(401).json({ error: 'Super admin access required' });
        }

        const superAdmin = await storage.getSuperAdmin(req.session.superAdminId);
        if (!superAdmin || !superAdmin.isActive) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: 'Invalid or inactive super admin' });
        }

        req.superAdmin = superAdmin;
        next();
    } catch (error) {
        logger.error('Super admin middleware error:', error);
        res.status(500).json({ error: 'Super admin authorization error' });
    }
};

export const requireWorkspaceAccess = (workspaceIdParam: string = 'workspaceId') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await requireAuth(req, res, () => {
            const workspaceId = parseInt(req.params[workspaceIdParam] || req.body[workspaceIdParam]);

            if (!workspaceId) {
                return res.status(400).json({ error: 'Workspace ID required' });
            }

            if (req.user?.workspaceId !== workspaceId && !req.session?.superAdminId) {
                return res.status(403).json({ error: 'Access denied to this workspace' });
            }

            req.workspaceId = workspaceId;
            next();
        });
    };
};

export const requirePermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await requireAuth(req, res, () => {
            if (!hasPermission(req.user, permission)) {
                return res.status(403).json({ error: `Permission '${permission}' required` });
            }
            next();
        });
    };
};

export const requireHRManager = async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
        if (req.user?.role !== 'hr_manager' && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'HR Manager access required' });
        }
        next();
    });
};

export const requireReportAccess = async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
        if (!req.user?.hasReportAccess && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Report access required' });
        }
        next();
    });
};
