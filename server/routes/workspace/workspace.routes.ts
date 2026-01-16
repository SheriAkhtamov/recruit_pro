import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { insertWorkspaceSchema } from "@shared/schema";
import { requireAuth, requireAdmin, requireWorkspaceAccess } from "../../middleware/auth.middleware";

const router = Router();

const updateWorkspaceSchema = insertWorkspaceSchema.partial().extend({
  logoUrl: z.string().url().optional().nullable(),
});

// Get current workspace info
router.get("/current", requireAuth, async (req, res, next) => {
  try {
    const workspace = await storage.getWorkspace(req.workspaceId!);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    res.json(workspace);
  } catch (error) {
    next(error);
  }
});

// Verify workspace access (used by super admin tooling)
router.get("/verify/:workspaceId", requireWorkspaceAccess("workspaceId"), async (req, res) => {
  const workspace = await storage.getWorkspace(req.workspaceId!);
  if (!workspace) {
    return res.status(404).json({ error: "Workspace not found" });
  }
  res.json({ ok: true, workspaceId: workspace.id });
});

// Update current workspace
router.put("/current", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, logoUrl } = req.body;
    const validation = updateWorkspaceSchema.safeParse({ name, logoUrl });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    const updatedWorkspace = await storage.updateWorkspace(req.workspaceId!, {
      name: validation.data.name,
      logoUrl: validation.data.logoUrl ?? undefined,
    });

    res.json(updatedWorkspace);
  } catch (error) {
    next(error);
  }
});

// Get workspace users
router.get("/users", requireAuth, async (req, res, next) => {
  try {
    const users = await storage.getUsers(req.workspaceId);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);

    res.json(usersWithoutPasswords);
  } catch (error) {
    next(error);
  }
});

// Get workspace statistics
router.get("/stats", requireAuth, async (req, res, next) => {
  try {
    // Get basic stats for the workspace
    const users = await storage.getUsers(req.workspaceId);
    const vacancies = await storage.getVacancies(req.workspaceId);
    const candidates = await storage.getCandidates(req.workspaceId);

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      onlineUsers: users.filter(u => u.isOnline).length,
      totalVacancies: vacancies.length,
      activeVacancies: vacancies.filter(v => v.status === 'active').length,
      totalCandidates: candidates.length,
      activeCandidates: candidates.filter(c => c.status === 'active').length,
      hiredCandidates: candidates.filter(c => c.status === 'hired').length,
      rejectedCandidates: candidates.filter(c => c.status === 'rejected').length,
      interviewsScheduled: candidates.filter(c => c.status === 'interview_scheduled').length,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get workspace departments
router.get("/departments", requireAuth, async (req, res, next) => {
  try {
    const departments = await storage.getDepartments(req.workspaceId);
    res.json(departments);
  } catch (error) {
    next(error);
  }
});

// Create department
router.post("/departments", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Check if department already exists in this workspace
    const existingDepartments = await storage.getDepartments(req.workspaceId);
    const nameExists = existingDepartments.some(d => d.name.toLowerCase() === name.toLowerCase());

    if (nameExists) {
      return res.status(409).json({ error: "Department with this name already exists" });
    }

    const department = await storage.createDepartment({
      name,
      description,
      workspaceId: req.workspaceId!,
    });

    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
});

// Update department
router.put("/departments/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const departmentId = Number.parseInt(req.params.id, 10);
    const { name, description } = req.body;

    if (Number.isNaN(departmentId)) {
      return res.status(400).json({ error: "Invalid department id" });
    }

    const updatedDepartment = await storage.updateDepartment(departmentId, {
      name,
      description,
    });

    res.json(updatedDepartment);
  } catch (error) {
    next(error);
  }
});

// Delete department
router.delete("/departments/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const departmentId = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(departmentId)) {
      return res.status(400).json({ error: "Invalid department id" });
    }

    await storage.deleteDepartment(departmentId);

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get workspace settings
router.get("/settings", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const settings = await storage.getSystemSettings(req.workspaceId!);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update workspace setting
router.put("/settings/:key", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!value) {
      return res.status(400).json({ error: "Setting value is required" });
    }

    const updatedSetting = await storage.setSystemSetting({
      workspaceId: req.workspaceId!,
      key,
      value,
      description
    });

    res.json(updatedSetting);
  } catch (error) {
    next(error);
  }
});

// Get workspace audit logs
router.get("/audit-logs", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const parsedLimit = Number.parseInt(limit as string, 10);
    const parsedOffset = Number.parseInt(offset as string, 10);

    if (Number.isNaN(parsedLimit) || Number.isNaN(parsedOffset)) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const result = await storage.getAuditLogs(
      req.workspaceId!,
      parsedLimit,
      parsedOffset
    );

    res.json({
      logs: result.logs,
      total: result.total,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    next(error);
  }
});

// Export workspace data (admin only)
router.get("/export", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { type } = req.query; // candidates, vacancies, users, all

    let exportData: any = {};

    switch (type) {
      case 'candidates':
        exportData.candidates = await storage.getCandidates(req.workspaceId);
        break;
      case 'vacancies':
        exportData.vacancies = await storage.getVacancies(req.workspaceId);
        break;
      case 'users':
        const users = await storage.getUsers(req.workspaceId);
        exportData.users = users.map(({ password, ...user }) => user);
        break;
      case 'all':
      default:
        exportData.candidates = await storage.getCandidates(req.workspaceId);
        exportData.vacancies = await storage.getVacancies(req.workspaceId);
        const allUsers = await storage.getUsers(req.workspaceId);
        exportData.users = allUsers.map(({ password, ...user }) => user);
        exportData.departments = await storage.getDepartments(req.workspaceId);
        break;
    }

    exportData.exportedAt = new Date().toISOString();
    exportData.workspaceId = req.workspaceId;

    res.json(exportData);
  } catch (error) {
    next(error);
  }
});

export default router;
