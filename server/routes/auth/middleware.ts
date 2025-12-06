import { Request, Response, NextFunction } from "express";
import { storage } from "../../storage";
import { authService } from "../../services/auth";
import { logger } from "../../lib/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      workspaceId?: number;
    }
  }
}

// Temporary hasPermission function until authService is updated
const hasPermission = (user: any, permission: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'hr_manager' && permission === 'view_reports') return user.hasReportAccess;
  return false;
};

// Authentication middleware - ensures user is logged in
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive) {
      req.session.destroy(() => { });
      return res.status(401).json({ error: "Invalid or inactive user" });
    }

    req.user = user;
    req.workspaceId = user.workspaceId;
    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Admin middleware - ensures user has admin role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, () => {
      if (req.user?.role !== "admin" && req.user?.role !== "hr_manager") {
        return res.status(403).json({ error: "Admin access required" });
      }
      next();
    });
  } catch (error) {
    logger.error("Admin middleware error:", error);
    res.status(500).json({ error: "Authorization error" });
  }
};

// Super Admin middleware - ensures user is super admin
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session?.superAdminId) {
      return res.status(401).json({ error: "Super admin authentication required" });
    }

    const superAdmin = await storage.getSuperAdmin(req.session.superAdminId);
    if (!superAdmin || !superAdmin.isActive) {
      req.session.destroy(() => { });
      return res.status(401).json({ error: "Invalid or inactive super admin" });
    }

    req.user = superAdmin;
    next();
  } catch (error) {
    logger.error("Super admin middleware error:", error);
    res.status(500).json({ error: "Super admin authorization error" });
  }
};

// Workspace access middleware - ensures user can access specific workspace
export const requireWorkspaceAccess = (workspaceIdParam: string = "workspaceId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await requireAuth(req, res, () => {
        const workspaceId = parseInt(req.params[workspaceIdParam] || req.body[workspaceIdParam]);

        if (!workspaceId) {
          return res.status(400).json({ error: "Workspace ID required" });
        }

        // Users can only access their own workspace unless they're super admin
        if (req.user?.workspaceId !== workspaceId && !req.session?.superAdminId) {
          return res.status(403).json({ error: "Access denied to this workspace" });
        }

        req.workspaceId = workspaceId;
        next();
      });
    } catch (error) {
      logger.error("Workspace access middleware error:", error);
      res.status(500).json({ error: "Workspace authorization error" });
    }
  };
};

// Permission checking middleware factory
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await requireAuth(req, res, () => {
        if (!hasPermission(req.user, permission)) {
          return res.status(403).json({ error: `Permission '${permission}' required` });
        }
        next();
      });
    } catch (error) {
      logger.error("Permission middleware error:", error);
      res.status(500).json({ error: "Permission check error" });
    }
  };
};

// HR Manager middleware - ensures user has HR manager or admin role
export const requireHRManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, () => {
      if (req.user?.role !== "hr_manager" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "HR Manager access required" });
      }
      next();
    });
  } catch (error) {
    logger.error("HR Manager middleware error:", error);
    res.status(500).json({ error: "HR Manager authorization error" });
  }
};

// Report access middleware - ensures user has report access
export const requireReportAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requireAuth(req, res, () => {
      if (!req.user?.hasReportAccess && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Report access required" });
      }
      next();
    });
  } catch (error) {
    logger.error("Report access middleware error:", error);
    res.status(500).json({ error: "Report access authorization error" });
  }
};
