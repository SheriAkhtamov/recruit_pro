import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { authService } from "../../services/auth";
import { insertUserSchema, insertUserSchemaForAPI } from "@shared/schema";
import { authLimiter } from "../config/rateLimit.config";
import { requireAuth, requireAdmin } from "./middleware";

const router = Router();

// Login route
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password, workspaceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await authService.authenticateUser(email, password, workspaceId);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create session
    req.session.userId = user.id;
    req.session.workspaceId = user.workspaceId;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err: Error | null) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Register route (only admins can register new users)
router.post("/register", requireAuth, requireAdmin, authLimiter, async (req, res, next) => {
  try {
    const validatedData = insertUserSchemaForAPI.parse(req.body);
    const { password } = req.body; // Password comes from req.body, not validated schema

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Check if user already exists in this workspace
    const existingUser = await storage.getUserByEmail(validatedData.email, req.workspaceId);
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(password);

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

// Get current user info
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    // Remove password from response
    const { password: _, ...userWithoutPassword } = req.user!;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { fullName, phone, dateOfBirth, position } = req.body;
    const normalizedDateOfBirth =
      dateOfBirth === undefined
        ? undefined
        : dateOfBirth === null || dateOfBirth === ''
          ? null
          : new Date(dateOfBirth);

    const updatedUser = await storage.updateUser(req.user!.id, {
      fullName,
      phone,
      dateOfBirth: normalizedDateOfBirth,
      position,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Change password
router.put("/change-password", requireAuth, authLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    // Verify current password
    const isValid = await authService.verifyPassword(currentPassword, req.user!.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await authService.hashPassword(newPassword);

    // Update password
    await storage.updateUser(req.user!.id, { password: hashedNewPassword });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

// Get all users (admin only)
router.get("/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await storage.getUsers(req.workspaceId);

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);

    res.json(usersWithoutPasswords);
  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role, isActive, hasReportAccess } = req.body;

    // Don't allow admin to deactivate themselves
    if (userId === req.user!.id && isActive === false) {
      return res.status(400).json({ error: "Cannot deactivate your own account" });
    }

    const updatedUser = await storage.updateUser(userId, {
      role,
      isActive,
      hasReportAccess,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
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

export default router;
