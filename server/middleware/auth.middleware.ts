import type { Request, Response, NextFunction } from 'express';

// Extend Express Request interface to include session and workspaceId
declare module 'express-serve-static-core' {
    interface Request {
        session: {
            user?: {
                id: number;
                workspaceId: number;
                role: string;
                isSuperAdminView?: boolean;
                hasReportAccess?: boolean;
                [key: string]: any;
            };
            superAdmin?: any;
            [key: string]: any;
        };
        workspaceId?: number;
    }
}

// Authentication middleware - adds workspaceId to request
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Add workspaceId to request for easy access
    req.workspaceId = req.session.user.workspaceId;
    next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // Block write operations in super admin view mode
    if (req.session.user.isSuperAdminView && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return res.status(403).json({
            error: 'Read-only mode',
            message: 'Modifications are not allowed in view-only mode'
        });
    }

    next();
};

export const requireAnalyticsAccess = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = req.session.user;
    // Admin users or users with hasReportAccess can access analytics
    if (user.role === 'admin' || Boolean(user.hasReportAccess)) {
        next();
    } else {
        return res.status(403).json({ error: 'Analytics access not allowed. Contact administrator to enable report access.' });
    }
};

// Super Admin workspace management routes
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.superAdmin) {
        return res.status(401).json({ error: 'Super admin access required' });
    }
    next();
};
