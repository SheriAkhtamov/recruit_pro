import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { superAuthService } from "../../services/superAuth";
import { insertWorkspaceSchema, insertUserSchema } from "@shared/schema";
import { superAdminLimiter } from "../config/rateLimit.config";
import { requireSuperAdmin } from "./middleware";

const router = Router();

// Super admin login
router.post("/login", superAdminLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const superAdmin = await superAuthService.authenticateSuperAdmin(username, password);

    if (!superAdmin) {
      return res.status(401).json({ error: "Invalid super admin credentials" });
    }

    // Create session
    req.session.superAdminId = superAdmin.id;

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = superAdmin;

    res.json(adminWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Super admin logout
router.post("/logout", (req, res) => {
  req.session.destroy((err: Error | null) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Super admin logged out successfully" });
  });
});

// Get current super admin info
router.get("/me", requireSuperAdmin, async (req, res, next) => {
  try {
    // Remove password from response
    const { password: _, ...adminWithoutPassword } = req.user!;
    // Return wrapped in { superAdmin: ... } as expected by client
    res.json({ superAdmin: adminWithoutPassword });
  } catch (error) {
    next(error);
  }
});

// Get all workspaces
router.get("/workspaces", requireSuperAdmin, async (req, res, next) => {
  try {
    const workspaces = await storage.getWorkspaces();
    res.json(workspaces);
  } catch (error) {
    next(error);
  }
});

// Create workspace
router.post("/workspaces", requireSuperAdmin, superAdminLimiter, async (req, res, next) => {
  try {
    const validatedData = insertWorkspaceSchema.parse(req.body);

    // Check if workspace with this name already exists
    const existingWorkspaces = await storage.getWorkspaces();
    const nameExists = existingWorkspaces.some(w => w.name.toLowerCase() === validatedData.name.toLowerCase());

    if (nameExists) {
      return res.status(409).json({ error: "Workspace with this name already exists" });
    }

    const workspace = await storage.createWorkspace(validatedData);

    res.status(201).json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update workspace
router.put("/workspaces/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const { name, logoUrl } = req.body;

    // Only update valid InsertWorkspace properties (name, logoUrl)
    const updatedWorkspace = await storage.updateWorkspace(workspaceId, {
      name,
      logoUrl,
    });

    res.json(updatedWorkspace);
  } catch (error) {
    next(error);
  }
});

// Delete workspace
router.delete("/workspaces/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const workspaceId = parseInt(req.params.id);

    await storage.deleteWorkspace(workspaceId);

    res.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get workspace stats
router.get("/workspaces/:id/stats", requireSuperAdmin, async (req, res, next) => {
  try {
    const workspaceId = parseInt(req.params.id);

    // Get basic stats for the workspace
    const users = await storage.getUsers(workspaceId);
    const vacancies = await storage.getVacancies(workspaceId);
    const candidates = await storage.getCandidates(workspaceId);

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      totalVacancies: vacancies.length,
      activeVacancies: vacancies.filter(v => v.status === 'active').length,
      totalCandidates: candidates.length,
      activeCandidates: candidates.filter(c => c.status === 'active').length,
      hiredCandidates: candidates.filter(c => c.status === 'hired').length,
      rejectedCandidates: candidates.filter(c => c.status === 'rejected').length,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Create workspace admin user
router.post("/workspaces/:id/admin", requireSuperAdmin, superAdminLimiter, async (req, res, next) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const validatedData = insertUserSchema.parse(req.body);

    // Check if user already exists in this workspace
    const existingUser = await storage.getUserByEmail(validatedData.email, workspaceId);
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists in this workspace" });
    }

    // Hash password
    const hashedPassword = await superAuthService.hashPassword(validatedData.password);

    // Create admin user
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      workspaceId,
      role: "admin", // Force admin role for workspace admin
      isActive: true,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Get all super admins
router.get("/admins", requireSuperAdmin, async (req, res, next) => {
  try {
    // This would need to be implemented in storage
    // For now, return empty array as placeholder
    res.json([]);
  } catch (error) {
    next(error);
  }
});

// Create super admin (only for initial setup)
router.post("/admins", requireSuperAdmin, superAdminLimiter, async (req, res, next) => {
  try {
    const { username, password, email, fullName } = req.body;

    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if super admin already exists
    const existingAdmin = await storage.getSuperAdminByUsername(username);
    if (existingAdmin) {
      return res.status(409).json({ error: "Super admin with this username already exists" });
    }

    // Hash password
    const hashedPassword = await superAuthService.hashPassword(password);

    // Create super admin (note: email not in InsertSuperAdmin schema)
    const superAdmin = await storage.createSuperAdmin({
      username,
      password: hashedPassword,
      fullName,
      isActive: true,
    });

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = superAdmin;

    res.status(201).json(adminWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export default router;
