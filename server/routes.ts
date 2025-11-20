import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import session from "express-session";
import multer from "multer";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { superAuthService } from "./services/superAuth";
import { emailService } from "./services/email";
import bcrypt from "bcrypt";
import {
  insertUserSchema, insertUserSchemaForAPI, insertVacancySchema, insertVacancySchemaForAPI,
  insertCandidateSchema, insertCandidateSchemaForAPI, insertInterviewStageSchema, insertInterviewSchema,
  insertMessageSchema, insertDocumentationAttachmentSchema, insertWorkspaceSchema,
  insertDepartmentSchemaForAPI, insertSystemSettingSchemaForAPI
} from "@shared/schema";

// Configure multer for file uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer for photo uploads specifically
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure photos directory exists
    if (!fs.existsSync('uploads/photos/')) {
      fs.mkdirSync('uploads/photos/', { recursive: true });
    }
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename for photos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain'
    ];

    const isAllowed = allowedTypes.includes(file.mimetype);

    cb(null, isAllowed);
  },
});

// Multer configuration specifically for photos
const uploadPhoto = multer({
  storage: photoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    const allowedPhotoTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    const isAllowed = allowedPhotoTypes.includes(file.mimetype);

    cb(null, isAllowed);
  },
});

// Custom multer configuration for documentation candidates (photos + documents)
const documentationUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use different folders based on file type
      if (file.fieldname === 'photo') {
        if (!fs.existsSync('uploads/photos/')) {
          fs.mkdirSync('uploads/photos/', { recursive: true });
        }
        cb(null, 'uploads/photos/');
      } else {
        if (!fs.existsSync('uploads/')) {
          fs.mkdirSync('uploads/', { recursive: true });
        }
        cb(null, 'uploads/');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);

      if (file.fieldname === 'photo') {
        cb(null, `photo-${uniqueSuffix}${ext}`);
      } else {
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
      }
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'photo') {
      const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const isAllowed = allowedPhotoTypes.includes(file.mimetype);
      cb(null, isAllowed);
    } else {
      const allowedDocTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png',
        'text/plain'
      ];
      const isAllowed = allowedDocTypes.includes(file.mimetype);
      cb(null, isAllowed);
    }
  },
});

// Import session store for memory storage
import MemoryStore from 'memorystore';
const MemoryStoreSession = MemoryStore(session);

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'recruit-pro-secret-key',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  name: 'connect.sid', // Explicit session name
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  cookie: {
    secure: false, // Set to true only if using HTTPS
    httpOnly: true, // Prevent XSS attacks - JavaScript cannot access cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const, // CSRF protection (lax for better compatibility)
    domain: undefined, // Let browser decide
    path: '/', // Explicit path
  },
};

// Rate limiting configurations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: 'Слишком много попыток входа. Попробуйте позже.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
});

const superAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 super admin login attempts
  message: 'Слишком много попыток входа как суперадминистратор. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

// WebSocket clients management
const wsClients = new Set<WebSocket>();

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {


  app.use(session(sessionConfig));

  // Development auth bypass when no database configured
  if (!process.env.DATABASE_URL) {
    app.use((req: any, _res: any, next: any) => {
      if (!req.session.user) {
        req.session.user = {
          id: 1,
          email: 'admin@synergyhire.com',
          fullName: 'SynergyHire Admin',
          role: 'admin',
          workspaceId: 1,
        };
      }
      next();
    });
  }

  // Debug middleware to log session info
  // Uncomment to enable detailed session debugging
  /*
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      }
    next();
  });
  */

  // Authentication middleware - adds workspaceId to request
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Add workspaceId to request for easy access
    req.workspaceId = req.session.user.workspaceId;
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
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

  const requireAnalyticsAccess = (req: any, res: any, next: any) => {
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

  // Super Admin authentication routes
  app.post('/api/super-admin/login', superAdminLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const superAdmin = await superAuthService.authenticateSuperAdmin(username, password);
      if (!superAdmin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set super admin in session
      const sanitizedSuperAdmin = superAuthService.sanitizeSuperAdmin(superAdmin) as any;
      req.session.superAdmin = sanitizedSuperAdmin;
      req.session.user = undefined; // Clear regular user session

      req.session.save((err) => {
        if (err) {
          console.error('[SUPER ADMIN LOGIN] Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        res.json({ superAdmin: sanitizedSuperAdmin });
      });
    } catch (error) {
      console.error('[SUPER ADMIN LOGIN] Error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/super-admin/logout', (req, res) => {
    req.session.superAdmin = undefined;
    req.session.save(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/super-admin/me', (req, res) => {
    if (req.session?.superAdmin) {
      res.json({ superAdmin: req.session.superAdmin });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Test endpoints for debugging and setup
  // Test endpoint to check if super admin exists in DB
  app.get('/api/test/super-admin-check', async (req, res) => {
    try {
      const superAdmin = await storage.getSuperAdminByUsername('Sheri');
      if (superAdmin) {
        res.json({
          exists: true,
          id: superAdmin.id,
          username: superAdmin.username,
          isActive: superAdmin.isActive,
          fullName: superAdmin.fullName
        });
      } else {
        res.json({ exists: false, message: 'Super admin not found in database' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to force create super admin (for debugging - development only)
  app.post('/api/test/create-super-admin', async (req, res) => {
    try {
      // Get password from environment variable
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
      if (!superAdminPassword) {
        return res.status(500).json({ error: 'SUPER_ADMIN_PASSWORD not configured in environment' });
      }

      // Check if already exists
      const existing = await storage.getSuperAdminByUsername('Sheri');
      if (existing) {
        return res.json({
          message: 'Super admin already exists',
          id: existing.id,
          username: existing.username
        });
      }

      // Create super admin
      const superAdmin = await superAuthService.createSuperAdmin({
        username: 'Sheri',
        password: superAdminPassword,
        fullName: 'Sheri Super Admin',
        isActive: true,
      });

      res.json({
        message: 'Super admin created successfully',
        id: superAdmin.id,
        username: superAdmin.username,
        fullName: superAdmin.fullName
      });
    } catch (error: any) {
      console.error('Error creating super admin:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Super Admin workspace management routes
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.superAdmin) {
      return res.status(401).json({ error: 'Super admin access required' });
    }
    next();
  };

  // Super admin view workspace (read-only mode)
  app.post('/api/super-admin/view-workspace/:workspaceId', requireSuperAdmin, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId);
      // Get workspace info
      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        console.error('❌ [VIEW WORKSPACE] Workspace not found');
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Set super admin in view-only mode for this workspace
      (req.session as any).user = {
        id: 0,
        workspaceId: workspaceId,
        email: 'superadmin@view',
        fullName: 'Super Admin (Просмотр)',
        role: 'admin',
        hasReportAccess: true,
        isSuperAdminView: true,
      };

      req.session.save((err) => {
        if (err) {
          console.error('❌ [VIEW WORKSPACE] Error saving session:', err);
          return res.status(500).json({ error: 'Failed to enter workspace' });
        }
        res.json({ success: true, workspace });
      });
    } catch (error: any) {
      console.error('❌ [VIEW WORKSPACE] Error:', error);
      res.status(500).json({ error: 'Failed to enter workspace' });
    }
  });

  // Exit view-only mode and return to super admin panel
  app.post('/api/super-admin/exit-view', requireAuth, async (req, res) => {
    try {
      // Check if user is in super admin view mode
      if (!(req.session as any).user?.isSuperAdminView) {
        return res.status(400).json({ error: 'Not in view mode' });
      }

      // Clear user session but keep super admin session
      (req.session as any).user = undefined;

      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ error: 'Failed to exit view mode' });
        }
        res.json({ success: true });
      });
    } catch (error: any) {
      console.error('Error exiting view mode:', error);
      res.status(500).json({ error: 'Failed to exit view mode' });
    }
  });

  // Get all workspaces
  app.get('/api/super-admin/workspaces', requireSuperAdmin, async (req, res) => {
    try {
      const workspaces = await storage.getWorkspaces();
      res.json(workspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  });

  // Create workspace
  app.post('/api/super-admin/workspaces', requireSuperAdmin, uploadPhoto.single('logo'), async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Workspace name is required' });
      }

      // Handle logo upload
      let logoUrl = null;
      if (req.file) {
        logoUrl = `/api/files/photos/${req.file.filename}`;
      }

      // Create workspace
      const workspace = await storage.createWorkspace({
        name: name.trim(),
        logoUrl,
      });

      // Create default admin user for the workspace
      const adminPassword = await authService.generateRandomPassword();
      const adminUser = await authService.createUser({
        workspaceId: workspace.id,
        email: `admin@${name.toLowerCase().replace(/\s+/g, '')}.cognixhire.com`,
        password: adminPassword,
        fullName: `${name} Administrator`,
        role: 'admin',
        hasReportAccess: true,
        isActive: true,
      });

      res.json({
        workspace,
        adminCredentials: {
          email: adminUser.email,
          password: adminPassword,
        },
      });
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  // Update workspace
  app.put('/api/super-admin/workspaces/:id', requireSuperAdmin, uploadPhoto.single('logo'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const updates: any = {};
      if (name) updates.name = name.trim();

      // Handle logo upload
      if (req.file) {
        updates.logoUrl = `/api/files/photos/${req.file.filename}`;
      }

      const workspace = await storage.updateWorkspace(id, updates);
      res.json(workspace);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  });

  // Delete workspace
  app.delete('/api/super-admin/workspaces/:id', requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWorkspace(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });

  // Get workspace admin user with credentials
  app.get('/api/super-admin/workspaces/:id/admin', requireSuperAdmin, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const adminUser = await storage.getWorkspaceAdminUser(workspaceId);

      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found for this workspace' });
      }

      res.json(adminUser);
    } catch (error) {
      console.error('Error fetching workspace admin:', error);
      res.status(500).json({ error: 'Failed to fetch workspace admin' });
    }
  });

  // Update workspace admin user
  app.put('/api/super-admin/workspaces/:id/admin', requireSuperAdmin, async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id);
      const { email, fullName, password } = req.body;

      const adminUser = await storage.getWorkspaceAdminUser(workspaceId);
      if (!adminUser) {
        return res.status(404).json({ error: 'Admin user not found for this workspace' });
      }

      const updates: any = {};
      if (email) updates.email = email;
      if (fullName) updates.fullName = fullName;
      if (password) {
        updates.password = await authService.hashPassword(password);
      }

      const updatedUser = await storage.updateUser(adminUser.id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating workspace admin:', error);
      res.status(500).json({ error: 'Failed to update workspace admin' });
    }
  });

  // Auth routes (regular users)
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
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
      req.session.save((err) => {
        if (err) {
          console.error('[LOGIN] Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        res.json({ user: req.session.user });
      });
    } catch (error) {
      console.error('[LOGIN] Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (req.session?.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Get workspace information for current user
  app.get('/api/workspace', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID not found' });
      }

      const workspace = await storage.getWorkspace(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  });

  // User management routes
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const users = await storage.getUsers(workspaceId);
      res.json(users.map(user => authService.sanitizeUser(user)));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchemaForAPI.parse(req.body);
      const temporaryPassword = await authService.generateRandomPassword();
      // Convert dateOfBirth string to Date object if provided
      const processedUserData = {
        ...userData,
        workspaceId: req.workspaceId!, // Add workspaceId from session
        password: temporaryPassword,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
      };
      const user = await authService.createUser(processedUserData);
      // No email sending - credentials will be shown in admin panel
      // Create audit log
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        newValues: authService.sanitizeUser(user),
      });
      const responseUser = authService.sanitizeUser(user);
      res.json(responseUser);
    } catch (error) {
      console.error('[CREATE USER] Error creating user:', error);

      // Check if it's a duplicate email error
      if ((error as any).code === '23505' && (error as any).constraint === 'users_email_unique') {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      }

      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Get user with password (admin only)
  app.get('/api/users/:id/credentials', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
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
      console.error('Error fetching user credentials:', error);
      res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session?.user;

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

      // Update session if user updated their own profile
      if (currentUser?.id === id) {
        req.session.user = { ...req.session.user, ...(authService.sanitizeUser(updatedUser) as any) };
        req.session.save();
      }

      res.json(authService.sanitizeUser(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      if ((error as any).code === '23505' && (error as any).constraint === 'users_email_unique') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

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
      if (req.session!.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete users' });
      }

      await storage.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // System settings routes
  app.get('/api/system-settings', requireAdmin, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const settings = await storage.getSystemSettings(workspaceId);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ error: 'Failed to fetch system settings' });
    }
  });

  app.post('/api/system-settings', requireAdmin, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      // Validate request body without workspaceId
      const validated = insertSystemSettingSchemaForAPI.parse(req.body);

      const setting = await storage.setSystemSetting({
        ...validated,
        workspaceId,
      });

      res.status(201).json(setting);
    } catch (error: any) {
      console.error('Error updating system setting:', error);
      if (error.errors) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update system setting' });
    }
  });

  // Vacancy routes
  app.get('/api/vacancies', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const vacancies = await storage.getVacancies(workspaceId);
      res.json(vacancies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
  });

  app.get('/api/vacancies/active', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const activeVacancies = await storage.getActiveVacancies(workspaceId);
      res.json(activeVacancies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active vacancies' });
    }
  });

  app.post('/api/vacancies', requireAuth, async (req, res) => {
    try {
      // First validate the request body (without workspaceId and createdBy)
      const validatedData = insertVacancySchemaForAPI.parse(req.body);

      // Then add workspaceId and createdBy from session
      const vacancyData = insertVacancySchema.parse({
        ...validatedData,
        workspaceId: req.workspaceId,
        createdBy: req.session!.user!.id,
      });

      const vacancy = await storage.createVacancy(vacancyData);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_VACANCY',
        entityType: 'vacancy',
        entityId: vacancy.id,
        newValues: vacancy,
      });

      broadcastToClients({
        type: 'VACANCY_CREATED',
        data: vacancy,
      });

      res.json(vacancy);
    } catch (error: any) {
      console.error('Vacancy creation error:', error);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create vacancy' });
      }
    }
  });

  app.put('/api/vacancies/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const oldVacancy = await storage.getVacancy(id, req.workspaceId);
      const vacancy = await storage.updateVacancy(id, updates);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_VACANCY',
        entityType: 'vacancy',
        entityId: id,
        oldValues: oldVacancy,
        newValues: vacancy,
      });

      broadcastToClients({
        type: 'VACANCY_UPDATED',
        data: vacancy,
      });

      res.json(vacancy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update vacancy' });
    }
  });

  app.delete('/api/vacancies/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const vacancy = await storage.getVacancy(id, req.workspaceId);
      if (!vacancy) {
        return res.status(404).json({ error: 'Vacancy not found' });
      }

      await storage.deleteVacancy(id);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_VACANCY',
        entityType: 'vacancy',
        entityId: id,
        oldValues: [vacancy],
      });

      broadcastToClients({
        type: 'VACANCY_DELETED',
        data: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      res.status(500).json({ error: 'Failed to delete vacancy' });
    }
  });

  // Candidate routes
  app.get('/api/candidates', requireAuth, async (req, res) => {
    try {
      const userRole = req.session!.user!.role;
      const userId = req.session!.user!.id;

      let candidates;

      // Admin and HR managers can see all candidates
      if (userRole === 'admin' || userRole === 'manager') {
        candidates = await storage.getCandidates(req.workspaceId);
      } else {
        // Regular employees only see candidates assigned to them for interviews
        candidates = await storage.getCandidatesByInterviewer(userId, req.workspaceId);
      }

      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  // Get candidates assigned to specific interviewer (for employees)
  app.get('/api/candidates/interviewer/:id', requireAuth, async (req, res) => {
    try {
      const interviewerId = parseInt(req.params.id);
      const userId = req.session!.user!.id;

      // Security check: employees can only see their own assigned candidates
      if (req.session!.user!.role === 'employee' && interviewerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const candidates = await storage.getCandidatesByInterviewer(interviewerId, req.workspaceId);
      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch interviewer candidates:', error);
      res.status(500).json({ error: 'Failed to fetch interviewer candidates' });
    }
  });

  app.get('/api/candidates/archived', requireAuth, async (req, res) => {
    try {
      const candidates = await storage.getArchivedCandidatesWithAttachments(req.workspaceId);
      res.json(candidates);
    } catch (error) {
      console.error('Archive candidates error:', error);
      res.status(500).json({ error: 'Failed to fetch archived candidates' });
    }
  });

  app.get('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid candidate ID' });
      }

      const candidate = await storage.getCandidate(id, req.workspaceId);

      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const stages = await storage.getInterviewStagesByCandidate(id);
      const documentationAttachments = await storage.getDocumentationAttachments(id);

      res.json({ ...candidate, stages, documentationAttachments });
    } catch (error) {
      console.error('Single candidate error:', error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  // Debug middleware to log multipart form data
  const debugMultipart = (req: any, res: any, next: any) => {
    next();
  };

  app.post('/api/candidates', requireAuth, upload.array('files', 5), debugMultipart, async (req, res) => {
    try {
      // Ensure all required fields are present
      if (!req.body.fullName) {
        console.error('Missing required fields:', { fullName: req.body.fullName });
        return res.status(400).json({
          error: 'Missing required fields',
          details: { fullName: !!req.body.fullName }
        });
      }

      // Convert and validate data (without workspaceId and createdBy)
      const bodyData = {
        fullName: req.body.fullName,
        email: req.body.email || null,
        phone: req.body.phone || '',
        city: req.body.city || '',
        vacancyId: req.body.vacancyId ? parseInt(req.body.vacancyId) : null,
        source: req.body.source || '',
        currentStageIndex: 0,
        interviewStageChain: req.body.interviewStageChain ? JSON.parse(req.body.interviewStageChain) : null,
      };

      if (!bodyData.vacancyId) {
        return res.status(400).json({ error: 'Vacancy ID is required' });
      }

      if (!bodyData.interviewStageChain || bodyData.interviewStageChain.length === 0) {
        return res.status(400).json({ error: 'Interview stage chain is required' });
      }

      // Validate with API schema first
      const validatedData = insertCandidateSchemaForAPI.parse(bodyData);

      // Then add session data
      const candidateData = insertCandidateSchema.parse({
        ...validatedData,
        workspaceId: req.workspaceId,
        createdBy: req.session!.user!.id,
      });

      let resumeUrl = '';
      let resumeFilename = '';
      let parsedResumeData = null;

      // Handle file uploads (take first file as resume if any)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        const firstFile = files[0];
        resumeUrl = `/api/files/${firstFile.filename}`;
        resumeFilename = firstFile.originalname;
      }

      const candidate = await storage.createCandidate({
        ...candidateData,
        workspaceId: req.workspaceId!,
        resumeUrl,
        resumeFilename,
        parsedResumeData,
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_CREATED',
        data: candidate,
      });

      res.json(candidate);
    } catch (error) {
      console.error('Error creating candidate:', error);
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  });

  app.put('/api/candidates/:id', requireAuth, upload.array('files', 5), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldCandidate = await storage.getCandidate(id, req.workspaceId);
      if (!oldCandidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Process form data - only include fields that are provided
      const updates: any = {};

      if (req.body.fullName) updates.fullName = req.body.fullName;
      if (req.body.email) updates.email = req.body.email;
      if (req.body.phone) updates.phone = req.body.phone;
      if (req.body.city) updates.city = req.body.city;
      if (req.body.source) updates.source = req.body.source;
      if (req.body.notes) updates.notes = req.body.notes;

      // Handle status updates (like rejection)
      if (req.body.status) updates.status = req.body.status;
      if (req.body.rejectionReason) updates.rejectionReason = req.body.rejectionReason;
      if (req.body.rejectionStage !== undefined) updates.rejectionStage = parseInt(req.body.rejectionStage);

      // Handle vacancy ID
      if (req.body.vacancyId && req.body.vacancyId !== '') {
        const parsedVacancyId = parseInt(req.body.vacancyId);
        if (!isNaN(parsedVacancyId)) {
          updates.vacancyId = parsedVacancyId;
        }
      }

      // Handle file uploads if any
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        const firstFile = files[0];
        updates.resumeUrl = `/api/files/${firstFile.filename}`;
      }

      // Handle interview stage chain updates
      if (req.body.interviewStageChain) {
        try {
          const newStageChain = JSON.parse(req.body.interviewStageChain);
          // Delete existing stages
          await storage.deleteInterviewStagesByCandidate(id);

          // Create new stages
          for (let i = 0; i < newStageChain.length; i++) {
            const stage = newStageChain[i];
            const currentStageIndex = oldCandidate.currentStageIndex ?? 0;
            await storage.createInterviewStage({
              candidateId: id,
              stageIndex: i,
              stageName: stage.stageName,
              interviewerId: stage.interviewerId,
              status: i === currentStageIndex ? 'pending' :
                i < currentStageIndex ? 'passed' : 'waiting',
            });
          }

          updates.interviewStageChain = newStageChain;
        } catch (parseError) {
          console.error('Error parsing interview stage chain:', parseError);
          return res.status(400).json({ error: 'Invalid interview stage chain format' });
        }
      }

      const candidate = await storage.updateCandidate(id, updates);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [oldCandidate],
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_UPDATED',
        data: candidate,
      });

      res.json(candidate);
    } catch (error) {
      console.error('Error updating candidate:', error);
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session!.user!;

      // Only allow admin users to delete candidates
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete candidates' });
      }

      const candidate = await storage.getCandidate(id, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      await storage.deleteCandidate(id);

      await storage.createAuditLog({
        userId: currentUser.id,
        action: 'DELETE_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_DELETED',
        data: {
          id,
          deletedBy: currentUser.fullName,
          candidateName: candidate.fullName,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  // Upload photo for candidate
  app.post('/api/candidates/:id/photo', requireAuth, uploadPhoto.single('photo'), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);

      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }

      const photoUrl = `/api/files/photos/${req.file.filename}`;

      // Update candidate with photo URL
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl: photoUrl
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPLOAD_CANDIDATE_PHOTO',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_PHOTO_UPLOADED',
        data: { candidateId, photoUrl },
      });

      res.json({ success: true, photoUrl });
    } catch (error) {
      console.error('Error uploading candidate photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // Delete photo for candidate
  app.delete('/api/candidates/:id/photo', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);

      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Delete the file from filesystem if it exists
      if (candidate.photoUrl) {
        const filename = path.basename(candidate.photoUrl);
        const filePath = path.join('uploads/photos', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Update candidate to remove photo URL
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl: null
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_CANDIDATE_PHOTO',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_PHOTO_DELETED',
        data: { candidateId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting candidate photo:', error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // Dismiss candidate endpoint
  app.put('/api/candidates/:id/dismiss', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dismissalReason, dismissalDate } = req.body;

      // Check if user is admin
      if (req.session!.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can dismiss candidates' });
      }

      // Check if candidate exists and is hired
      const candidate = await storage.getCandidate(id, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (candidate.status !== 'hired') {
        return res.status(400).json({ error: 'Only hired candidates can be dismissed' });
      }

      // Dismiss the candidate
      const dismissedCandidate = await storage.dismissCandidate(id, dismissalReason, new Date(dismissalDate), req.workspaceId);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DISMISS_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [candidate],
        newValues: [dismissedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_DISMISSED',
        data: dismissedCandidate,
      });

      res.json(dismissedCandidate);
    } catch (error) {
      console.error('Error dismissing candidate:', error);
      res.status(500).json({ error: 'Failed to dismiss candidate' });
    }
  });

  // Test route to create sample documentation candidate (development only)
  app.post('/api/test/create-documentation-candidate', requireAuth, async (req, res) => {
    try {
      // First, ensure we have a vacancy
      let vacancies = await storage.getVacancies();
      let vacancy;

      if (vacancies.length === 0) {
        // Create a test vacancy
        const vacancyData = {
          workspaceId: req.workspaceId!,
          title: 'Test Position',
          department: 'IT',
          description: 'Sample position for testing documentation workflow',
          requirements: 'Basic requirements',
          location: 'Remote',
          status: 'active',
          createdBy: req.session!.user!.id,
        };
        vacancy = await storage.createVacancy(vacancyData);
      } else {
        vacancy = vacancies[0];
      }

      // Create candidate directly with documentation status
      const candidateData = {
        workspaceId: req.workspaceId!,
        fullName: 'Test Candidate For Documentation',
        email: 'test.candidate@example.com',
        phone: '+1234567890',
        city: 'Test City',
        vacancyId: vacancy.id,
        status: 'documentation',
        source: 'test_data',
        createdBy: req.session!.user!.id,
      };

      const candidate = await storage.createCandidate(candidateData);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_TEST_DOCUMENTATION_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'TEST_DOCUMENTATION_CANDIDATE_CREATED',
        data: candidate,
      });

      res.json({ success: true, candidate, vacancy });
    } catch (error) {
      console.error('Error creating test documentation candidate:', error);
      res.status(500).json({ error: 'Failed to create test documentation candidate' });
    }
  });

  // Documentation routes for candidates in documentation status
  app.get('/api/documentation/candidates', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const candidates = await storage.getCandidatesByStatus('documentation', workspaceId);
      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch documentation candidates:', error);
      res.status(500).json({ error: 'Failed to fetch documentation candidates' });
    }
  });

  app.post('/api/documentation/candidates', requireAuth, documentationUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]), async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.fullName) {
        return res.status(400).json({ error: 'Full name is required' });
      }

      if (!req.body.vacancyId) {
        return res.status(400).json({ error: 'Vacancy is required' });
      }

      // Create candidate with documentation status
      const candidateData: any = {
        workspaceId: req.workspaceId,
        fullName: req.body.fullName,
        email: req.body.email || '',
        phone: req.body.phone || '',
        city: req.body.city || '',
        vacancyId: parseInt(req.body.vacancyId),
        status: 'documentation',
        source: 'manual_documentation',
        createdBy: req.session!.user!.id,
      };

      // Handle photo upload
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files && files.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        candidateData.photoUrl = `/api/files/photos/${photoFile.filename}`;
        }

      const candidate = await storage.createCandidate(candidateData);

      // Handle document uploads
      if (files && files.documents && files.documents.length > 0) {
        const documentFiles = files.documents;
        for (const file of documentFiles) {
          await storage.createDocumentationAttachment({
            candidateId: candidate.id,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session!.user!.id,
          });
        }
      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_DOCUMENTATION_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'DOCUMENTATION_CANDIDATE_CREATED',
        data: candidate,
      });

      res.json(candidate);
    } catch (error) {
      console.error('Error creating documentation candidate:', error);
      res.status(500).json({ error: 'Failed to create documentation candidate' });
    }
  });

  app.put('/api/documentation/candidates/:id/upload', requireAuth, upload.array('documents', 10), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);

      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (candidate.status !== 'documentation') {
        return res.status(400).json({ error: 'Candidate is not in documentation status' });
      }

      const attachments = [];

      // Handle document uploads
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        for (const file of files) {
          const attachment = await storage.createDocumentationAttachment({
            candidateId: candidateId,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session!.user!.id,
          });
          attachments.push(attachment);
        }
      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPLOAD_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        newValues: attachments,
      });

      broadcastToClients({
        type: 'DOCUMENTATION_UPLOADED',
        data: { candidateId, attachments },
      });

      res.json({ success: true, attachments });
    } catch (error) {
      console.error('Error uploading documentation:', error);
      res.status(500).json({ error: 'Failed to upload documentation' });
    }
  });

  app.get('/api/documentation/candidates/:id/attachments', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const attachments = await storage.getDocumentationAttachments(candidateId);
      res.json(attachments);
    } catch (error) {
      console.error('Error fetching documentation attachments:', error);
      res.status(500).json({ error: 'Failed to fetch documentation attachments' });
    }
  });

  app.delete('/api/documentation/attachments/:id', requireAuth, async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);

      const attachment = await storage.getDocumentationAttachment(attachmentId);
      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      // Ensure attachment belongs to a candidate in the current workspace
      const candidate = await storage.getCandidate(attachment.candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Delete the file from filesystem
      const filePath = path.join('uploads', attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await storage.deleteDocumentationAttachment(attachmentId);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_DOCUMENTATION_ATTACHMENT',
        entityType: 'documentation_attachment',
        entityId: attachmentId,
        oldValues: [attachment],
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting documentation attachment:', error);
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  });

  app.put('/api/documentation/candidates/:id/complete', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);

      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (candidate.status !== 'documentation') {
        return res.status(400).json({ error: 'Candidate is not in documentation status' });
      }

      // Update candidate status to hired
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: 'hired'
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'COMPLETE_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_HIRED',
        data: updatedCandidate,
      });

      res.json(updatedCandidate);
    } catch (error) {
      console.error('Error completing documentation:', error);
      res.status(500).json({ error: 'Failed to complete documentation' });
    }
  });

  // Update candidate status to documentation when all interview stages are passed
  app.put('/api/candidates/:id/move-to-documentation', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);

      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (candidate.status !== 'active') {
        return res.status(400).json({ error: 'Candidate is not in active status' });
      }

      // Verify all interview stages are completed successfully
      const stages = await storage.getInterviewStagesByCandidate(candidateId);

      if (stages.length === 0) {
        return res.status(400).json({ error: 'Candidate has no interview stages defined' });
      }

      const allPassed = stages.every(stage => stage.status === 'passed');

      if (!allPassed) {
        return res.status(400).json({ error: 'Not all interview stages have been passed' });
      }

      // Update candidate status to documentation
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: 'documentation'
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'MOVE_TO_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_MOVED_TO_DOCUMENTATION',
        data: updatedCandidate,
      });

      res.json(updatedCandidate);
    } catch (error) {
      console.error('Error moving candidate to documentation:', error);
      res.status(500).json({ error: 'Failed to move candidate to documentation' });
    }
  });

  // Interview stage routes
  app.post('/api/interview-stages', requireAuth, async (req, res) => {
    try {
      const stageData = insertInterviewStageSchema.parse(req.body);
      const stage = await storage.createInterviewStage(stageData);

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_INTERVIEW_STAGE',
        entityType: 'interview_stage',
        entityId: stage.id,
        newValues: [stage],
      });

      res.json(stage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create interview stage' });
    }
  });

  app.put('/api/interview-stages/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // If marking as passed or failed, require feedback
      if ((updates.status === 'passed' || updates.status === 'failed') &&
        (!updates.comments || updates.comments.trim() === '')) {
        return res.status(400).json({ error: 'Feedback is required when completing interview stages' });
      }

      const stage = await storage.updateInterviewStage(id, updates);

      // Also update any related interview records
      const relatedInterviews = await storage.getInterviewsByStage(id);
      if (relatedInterviews.length > 0) {
        const interviewOutcome = updates.status === 'passed' ? 'passed' :
          updates.status === 'failed' ? 'failed' : null;

        if (interviewOutcome) {
          for (const interview of relatedInterviews) {
            await storage.updateInterview(interview.id, {
              outcome: interviewOutcome,
              status: 'completed',
              notes: updates.comments || '',
            });
          }
        }
      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_INTERVIEW_STAGE',
        entityType: 'interview_stage',
        entityId: id,
        newValues: [stage],
      });

      broadcastToClients({
        type: 'INTERVIEW_STAGE_UPDATED',
        data: stage,
      });

      res.json(stage);
    } catch (error) {
      console.error('Update interview stage error:', error);
      res.status(500).json({ error: 'Failed to update interview stage' });
    }
  });

  // Interview routes
  app.get('/api/interviews', requireAuth, async (req, res) => {
    try {
      const { start, end, interviewerId, stageId } = req.query;

      let interviews;
      if (start && end) {
        interviews = await storage.getInterviewsByDateRange(
          new Date(start as string),
          new Date(end as string),
          req.workspaceId
        );
      } else if (interviewerId) {
        interviews = await storage.getInterviewsByInterviewer(
          parseInt(interviewerId as string),
          req.workspaceId
        );
      } else if (stageId) {
        interviews = await storage.getInterviewsByStage(
          parseInt(stageId as string)
        );
      } else {
        interviews = await storage.getInterviews(req.workspaceId);
      }

      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  // Add specific route for interviewer-based interviews  
  app.get('/api/interviews/interviewer/:interviewerId', requireAuth, async (req, res) => {
    try {
      const interviewerId = parseInt(req.params.interviewerId);
      if (isNaN(interviewerId)) {
        return res.status(400).json({ error: 'Invalid interviewer ID' });
      }

      const interviews = await storage.getInterviewsByInterviewer(interviewerId, req.workspaceId);
      res.json(interviews);
    } catch (error) {
      console.error('Error fetching interviews by interviewer:', error);
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  app.post('/api/interviews', requireAuth, async (req, res) => {
    try {
      const { stageId, candidateId, interviewerId, scheduledAt, duration, notes } = req.body;

      // Check if user is the creator of the candidate (responsible manager)
      const candidate = await storage.getCandidate(candidateId, req.workspaceId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (candidate.createdBy !== req.session!.user!.id) {
        return res.status(403).json({ error: 'Only the responsible manager can schedule interviews' });
      }

      const interview = await storage.scheduleInterview(
        stageId,
        interviewerId,
        new Date(scheduledAt),
        duration || 30
      );

      // Send notification to interviewer
      const interviewer = await storage.getUser(interviewerId);

      if (interviewer && candidate) {
        await emailService.sendInterviewNotification(
          interviewer.email,
          candidate.fullName,
          new Date(scheduledAt),
          interviewer.fullName
        );


      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'SCHEDULE_INTERVIEW',
        entityType: 'interview',
        entityId: interview.id,
        newValues: [interview],
      });

      broadcastToClients({
        type: 'INTERVIEW_SCHEDULED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Schedule interview error:', error);
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  });

  app.put('/api/interviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Check if this is a reschedule operation
      const isReschedule = updates.scheduledAt && updates.scheduledAt !== '';
      let oldInterview = null;

      if (isReschedule) {
        // Get the interview details before updating for comparison
        oldInterview = await storage.getInterview(id);
      }

      const interview = await storage.updateInterview(id, updates);

      // Handle reschedule notifications
      if (isReschedule && oldInterview) {
        // Get candidate and interviewer details for notifications
        const candidate = await storage.getCandidate(oldInterview.candidateId, req.workspaceId);
        const interviewer = await storage.getUser(oldInterview.interviewerId, req.workspaceId);



        // Create in-app notification for interviewer
        await storage.createNotification({
          userId: oldInterview.interviewerId,
          type: 'interview_rescheduled',
          title: 'Собеседование перенесено',
          message: `Собеседование с ${candidate?.fullName || 'кандидатом'} перенесено на ${new Date(updates.scheduledAt).toLocaleString('ru-RU')}`,
          relatedEntityType: 'interview',
          relatedEntityId: interview.id,
          isRead: false,
        });
      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: isReschedule ? 'RESCHEDULE_INTERVIEW' : 'UPDATE_INTERVIEW',
        entityType: 'interview',
        entityId: id,
        newValues: [interview],
      });

      broadcastToClients({
        type: isReschedule ? 'INTERVIEW_RESCHEDULED' : 'INTERVIEW_UPDATED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Update interview error:', error);
      res.status(500).json({ error: 'Failed to update interview' });
    }
  });

  // Get all interview stages for dashboard
  app.get('/api/interview-stages', requireAuth, async (req, res) => {
    try {
      const stages = await storage.getAllInterviewStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/dashboard', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getDashboardStats(workspaceId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  app.get('/api/analytics/conversion-funnel', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const funnel = await storage.getConversionFunnel(workspaceId);
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversion funnel' });
    }
  });

  app.get('/api/analytics/hiring-trends', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const trends = await storage.getHiringTrends(workspaceId);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hiring trends' });
    }
  });

  app.get('/api/analytics/department-stats', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getDepartmentStats(workspaceId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch department stats' });
    }
  });

  app.get('/api/analytics/time-to-hire', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getTimeToHireStats(workspaceId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch time to hire stats' });
    }
  });

  app.get('/api/analytics/rejections-by-stage', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const { month, year } = req.query;
      let rejections;

      if (month && year) {
        rejections = await storage.getRejectionsByStageByMonth(workspaceId, month as string, year as string);
      } else {
        rejections = await storage.getRejectionsByStage(workspaceId);
      }

      res.json(rejections);
    } catch (error) {
      console.error('Error fetching rejections by stage:', error);
      res.status(500).json({ error: 'Failed to fetch rejections by stage' });
    }
  });

  app.get('/api/analytics/dashboard-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
      }

      const stats = await storage.getDashboardStatsByMonth(workspaceId, month as string, year as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats by month:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats by month' });
    }
  });

  app.get('/api/analytics/conversion-funnel-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const { month, year } = req.query;

      if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
      }

      const funnel = await storage.getConversionFunnelByMonth(workspaceId, month as string, year as string);
      res.json(funnel);
    } catch (error) {
      console.error('Error fetching conversion funnel by month:', error);
      res.status(500).json({ error: 'Failed to fetch conversion funnel by month' });
    }
  });

  app.get('/api/analytics/available-periods', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const periods = await storage.getAvailableDataPeriods(workspaceId);
      res.json(periods);
    } catch (error) {
      console.error('Error fetching available periods:', error);
      res.status(500).json({ error: 'Failed to fetch available periods' });
    }
  });

  // Hired and dismissed analytics routes
  app.get('/api/analytics/hired-dismissed-stats', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getHiredAndDismissedStats(workspaceId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats' });
    }
  });

  app.get('/api/analytics/hired-dismissed-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getHiredAndDismissedStatsByMonth(workspaceId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats by month:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats by month' });
    }
  });

  app.get('/api/analytics/hired-dismissed-by-year', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const stats = await storage.getHiredAndDismissedStatsByYear(workspaceId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats by year:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats by year' });
    }
  });

  // Department routes
  app.get('/api/departments', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const departments = await storage.getDepartments(workspaceId);
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  });

  app.post('/api/departments', requireAuth, async (req, res) => {
    try {
      // Validate request body without workspaceId
      const validatedData = insertDepartmentSchemaForAPI.parse(req.body);

      // Add workspaceId from session
      const department = await storage.createDepartment({
        ...validatedData,
        workspaceId: req.workspaceId!,
      });

      res.status(201).json(department);
    } catch (error: any) {
      console.error('Error creating department:', error);
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  app.put('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }

      const workspaceId = req.workspaceId;

      // Ensure department belongs to current workspace
      const existing = await storage.getDepartment(id, workspaceId);
      if (!existing) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const department = await storage.updateDepartment(id, {
        name: name.trim(),
        description: description?.trim() || null,
      }, workspaceId);

      res.json(department);
    } catch (error: any) {
      console.error('Error updating department:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  app.delete('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const workspaceId = req.workspaceId;

      // Ensure department belongs to current workspace
      const existing = await storage.getDepartment(id, workspaceId);
      if (!existing) {
        return res.status(404).json({ error: 'Department not found' });
      }

      // Check if any vacancies in this workspace use this department
      const vacancies = await storage.getVacancies(workspaceId);
      const departmentInUse = vacancies.some(v => v.departmentId === id);

      if (departmentInUse) {
        return res.status(400).json({
          error: 'Cannot delete department that is used by vacancies'
        });
      }

      await storage.deleteDepartment(id, workspaceId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // Enhanced interview management routes
  app.put('/api/interviews/:id/outcome', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { outcome, notes } = req.body;

      // Validate that notes/feedback is provided
      if (!notes || notes.trim() === '') {
        return res.status(400).json({ error: 'Feedback is required for interview outcomes' });
      }

      const interview = await storage.updateInterviewOutcome(id, outcome, notes);

      // Also update the corresponding interview stage
      if (interview.stageId) {
        const stageStatus = outcome === 'passed' ? 'passed' : outcome === 'failed' ? 'failed' : 'pending';
        await storage.updateInterviewStage(interview.stageId, {
          status: stageStatus,
          completedAt: new Date(),
          comments: notes,
        });

        // If stage passed, update candidate's current stage index
        if (outcome === 'passed') {
          const stage = await storage.getInterviewStage(interview.stageId);
          if (stage && interview.candidateId) {
            const nextStageIndex = stage.stageIndex + 1;
            await storage.updateCandidate(interview.candidateId, {
              currentStageIndex: nextStageIndex
            });
          }
        }
      }

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_INTERVIEW_OUTCOME',
        entityType: 'interview',
        entityId: id,
        newValues: [{ outcome, notes }],
      });

      broadcastToClients({
        type: 'INTERVIEW_COMPLETED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Update interview outcome error:', error);
      res.status(500).json({ error: 'Failed to update interview outcome' });
    }
  });

  app.put('/api/interviews/:id/reschedule', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newDateTime } = req.body;

      // Get the interview details before updating
      const interviewDetails = await storage.getInterview(id);
      if (!interviewDetails) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      const interview = await storage.rescheduleInterview(id, new Date(newDateTime));

      // Get candidate and interviewer details for notifications
      const candidate = await storage.getCandidate(interviewDetails.candidateId, req.workspaceId);
      const interviewer = await storage.getUser(interviewDetails.interviewerId, req.workspaceId);



      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'RESCHEDULE_INTERVIEW',
        entityType: 'interview',
        entityId: id,
        newValues: [{ oldDateTime: interviewDetails.scheduledAt, newDateTime }],
      });

      broadcastToClients({
        type: 'INTERVIEW_RESCHEDULED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Reschedule interview error:', error);
      res.status(500).json({ error: 'Failed to reschedule interview' });
    }
  });

  app.get('/api/interview-stages/candidate/:candidateId', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const stages = await storage.getInterviewStagesByCandidate(candidateId);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
  });

  // Update interview stage comments (for feedback editing)
  app.put('/api/interview-stages/:id/comments', requireAuth, async (req, res) => {
    try {
      const stageId = parseInt(req.params.id);
      const { comments } = req.body;
      const currentUserId = req.session!.user!.id;
      const currentUser = req.session!.user!;

      // Get the interview stage to check permissions
      const stage = await storage.getInterviewStage(stageId);
      if (!stage) {
        return res.status(404).json({ error: 'Interview stage not found' });
      }

      // Only allow the interviewer or admin to edit feedback
      if (stage.interviewerId !== currentUserId && currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'You can only edit your own feedback' });
      }

      // Update only the comments field
      const updatedStage = await storage.updateInterviewStage(stageId, {
        comments
      });

      await storage.createAuditLog({
        userId: currentUserId,
        action: 'UPDATE_INTERVIEW_STAGE_COMMENTS',
        entityType: 'interview_stage',
        entityId: stageId,
        oldValues: [{ comments: stage.comments }],
        newValues: [{ comments }],
      });

      // Broadcast the update to all connected clients for real-time sync
      broadcastToClients({
        type: 'INTERVIEW_STAGE_COMMENTS_UPDATED',
        data: {
          stageId,
          candidateId: stage.candidateId,
          comments,
          updatedBy: currentUser.fullName,
        },
      });

      res.json(updatedStage);
    } catch (error) {
      console.error('Update interview stage comments error:', error);
      res.status(500).json({ error: 'Failed to update interview stage comments' });
    }
  });

  app.post('/api/interviews/schedule', requireAuth, async (req, res) => {
    try {
      const { stageId, interviewerId, scheduledAt, duration } = req.body;

      // Validate required fields
      if (!stageId || !interviewerId || !scheduledAt) {
        return res.status(400).json({ error: 'Missing required fields: stageId, interviewerId, and scheduledAt are required' });
      }

      const interview = await storage.scheduleInterview(
        parseInt(stageId),
        parseInt(interviewerId),
        new Date(scheduledAt),
        duration || 30
      );

      // If we get here, the interview was scheduled successfully
      broadcastToClients({
        type: 'INTERVIEW_SCHEDULED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Schedule interview error:', error);

      // Check for specific database constraint errors
      if ((error as any).code === '23503') {
        return res.status(404).json({ error: 'Referenced stage or interviewer not found' });
      }

      // Check for time conflict errors
      if ((error as any).message?.includes('занят') || (error as any).message?.includes('busy') || (error as any).message?.includes('conflict')) {
        return res.status(409).json({ error: (error as any).message || 'Interviewer is busy at this time' });
      }

      // For other errors, return 500 (internal server error)
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  });

  app.get('/api/analytics/funnel', requireAnalyticsAccess, async (req, res) => {
    try {
      const workspaceId = req.workspaceId!;
      const funnel = await storage.getConversionFunnel(workspaceId);
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversion funnel' });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session!.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUserId = req.session!.user!.id;
      await storage.markNotificationAsRead(id, currentUserId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUserId = req.session!.user!.id;

      // Check if notification belongs to current user
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== currentUserId) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // Messages routes
  app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session!.user!.id;
      const conversations = await storage.getConversationsByUser(currentUserId, req.workspaceId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/messages/:receiverId', requireAuth, async (req, res) => {
    try {
      const receiverId = parseInt(req.params.receiverId);
      const currentUserId = req.session!.user!.id;

      if (isNaN(receiverId)) {
        return res.status(400).json({ error: 'Invalid receiver ID' });
      }

      const workspaceId = req.workspaceId;

      // Ensure receiver belongs to the same workspace
      const receiver = await storage.getUser(receiverId, workspaceId);
      if (!receiver) {
        return res.status(404).json({ error: 'User not found' });
      }

      const messages = await storage.getMessagesBetweenUsers(currentUserId, receiverId);
      // Ensure we always return an array
      const result = Array.isArray(messages) ? messages : [];
      res.json(result);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.session!.user!.id;
      const workspaceId = req.workspaceId;

      if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver ID and content are required' });
      }

      // Ensure receiver belongs to the same workspace
      const receiver = await storage.getUser(parseInt(receiverId), workspaceId);
      if (!receiver) {
        return res.status(404).json({ error: 'User not found' });
      }

      const message = await storage.createMessage({
        senderId,
        receiverId: parseInt(receiverId),
        content: content.trim(),
      });

      // Broadcast message to WebSocket clients
      broadcastToClients({
        type: 'NEW_MESSAGE',
        data: message,
      });

      res.json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.put('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const currentUserId = req.session!.user!.id;

      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }

      const message = await storage.markMessageAsRead(messageId, currentUserId);
      res.json(message);
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // Online status routes
  app.post('/api/users/online-status', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.user!.id;
      const { isOnline } = req.body;

      await storage.updateUserOnlineStatus(userId, isOnline);

      // Broadcast status change to all clients
      broadcastToClients({
        type: 'USER_STATUS_CHANGED',
        data: { userId, isOnline, lastSeenAt: new Date() },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating online status:', error);
      res.status(500).json({ error: 'Failed to update online status' });
    }
  });

  app.get('/api/users/online-status', requireAuth, async (req, res) => {
    try {
      const workspaceId = req.workspaceId;
      const users = await storage.getUsersWithOnlineStatus(workspaceId);
      res.json(users);
    } catch (error) {
      console.error('Error fetching online status:', error);
      res.status(500).json({ error: 'Failed to fetch online status' });
    }
  });

  // Photo serving route with display headers (not download)
  // Made public to allow workspace logos to be visible without authentication
  app.get('/api/files/photos/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads/photos', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // Set proper headers for display (not download)
    res.setHeader('Content-Length', stat.size);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    const contentType = contentTypes[ext] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  // File download route with proper headers
  app.get('/api/files/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // Set proper headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  // Legacy static file serving (for backward compatibility)
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);

  // WebSocket server with user tracking
  const userSocketMap = new Map<number, WebSocket>();
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    wsClients.add(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'USER_CONNECT' && message.userId) {
          userSocketMap.set(message.userId, ws);
          await storage.updateUserOnlineStatus(message.userId, true);

          // Broadcast user came online
          broadcastToClients({
            type: 'USER_STATUS_CHANGED',
            data: { userId: message.userId, isOnline: true, lastSeenAt: new Date() },
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      wsClients.delete(ws);

      // Find and remove user from online status
      for (const [userId, socket] of userSocketMap.entries()) {
        if (socket === ws) {
          userSocketMap.delete(userId);
          await storage.updateUserOnlineStatus(userId, false);

          // Broadcast user went offline
          broadcastToClients({
            type: 'USER_STATUS_CHANGED',
            data: { userId, isOnline: false, lastSeenAt: new Date() },
          });
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
