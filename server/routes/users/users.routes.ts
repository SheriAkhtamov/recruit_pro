import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { authService } from "../../services/auth";
import { insertUserSchemaForAPI } from "@shared/schema";
import { requireAuth, requireAdmin, requireHRManager } from "../auth/middleware";

// Temporary hasPermission function until authService is updated
const hasPermission = (user: any, permission: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'hr_manager' && permission === 'view_reports') return user.hasReportAccess;
  return false;
};

const router = Router();

// Get all users (admin/HR manager only)
router.get("/", requireAuth, requireHRManager, async (req, res, next) => {
  try {
    const { role, isActive, department } = req.query;
    
    let users = await storage.getUsers(req.workspaceId);
    
    // Apply filters
    if (role) {
      users = users.filter(user => user.role === role);
    }
    
    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      users = users.filter(user => user.isActive === activeFilter);
    }
    
    if (department) {
      users = users.filter(user => user.department === department);
    }
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Users can only view their own profile unless they're admin/HR manager
    if (userId !== req.user!.id && !hasPermission(req.user!, 'manage_users')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await storage.getUser(userId, req.workspaceId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Create user (admin only)
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const validatedData = insertUserSchemaForAPI.parse(req.body);
    
    // Check if user already exists in this workspace
    const existingUser = await storage.getUserByEmail(validatedData.email, req.workspaceId);
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(validatedData.password);
    
    // Create user
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      workspaceId: req.workspaceId!,
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

// Update user
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Users can only update their own profile unless they're admin/HR manager
    if (userId !== req.user!.id && !hasPermission(req.user!, 'manage_users')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { fullName, phone, dateOfBirth, position, department, role, isActive, hasReportAccess } = req.body;
    
    // Regular users can only update certain fields
    const isSelfUpdate = userId === req.user!.id;
    const canManageUsers = hasPermission(req.user!, 'manage_users');
    
    let updateData: any = {};
    
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (position !== undefined) updateData.position = position;
    if (department !== undefined) updateData.department = department;
    
    // Only admins can update these fields
    if (!isSelfUpdate && canManageUsers) {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (hasReportAccess !== undefined) updateData.hasReportAccess = hasReportAccess;
    }

    const updatedUser = await storage.updateUser(userId, updateData);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    // Don't allow admin to delete themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    await storage.deleteUser(userId);
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Update user online status (internal use)
router.put("/:id/online-status", requireAuth, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { isOnline } = req.body;

    // Users can only update their own online status
    if (userId !== req.user!.id && !hasPermission(req.user!, 'manage_users')) {
      return res.status(403).json({ error: "Access denied" });
    }

    await storage.updateUserOnlineStatus(userId, isOnline);
    
    res.json({ message: "Online status updated successfully" });
  } catch (error) {
    next(error);
  }
});

// Get users with online status
router.get("/online-status/list", requireAuth, async (req, res, next) => {
  try {
    const users = await storage.getUsersWithOnlineStatus(req.workspaceId);
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    next(error);
  }
});

// Get workspace admin user
router.get("/workspace-admin/current", requireAuth, async (req, res, next) => {
  try {
    const adminUser = await storage.getWorkspaceAdminUser(req.workspaceId!);
    
    if (!adminUser) {
      return res.status(404).json({ error: "No admin user found for this workspace" });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = adminUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Reset user password (admin only)
router.post("/:id/reset-password", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(newPassword);
    
    // Update password
    await storage.updateUser(userId, { password: hashedPassword });
    
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

// Toggle user active status (admin only)
router.post("/:id/toggle-active", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    // Don't allow admin to deactivate themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Cannot change your own active status" });
    }

    const user = await storage.getUser(userId, req.workspaceId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await storage.updateUser(userId, { isActive: !user.isActive });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

export default router;
