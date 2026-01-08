import multer, { type FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import { Request } from "express";

// Use Express.Multer.File type from @types/multer
// Do not redeclare Express.Request.file/files as it conflicts with @types/multer
type MulterFile = Express.Multer.File;

// Configure multer for file uploads
export const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/', { recursive: true });
    }
    const requestId = req.headers['x-request-id'];
    if (requestId && process.env.NODE_ENV !== 'production') {
      console.debug(`Upload request ${requestId} for ${file.originalname}`);
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const workspaceId = (req as any).workspaceId;
    const workspacePrefix = workspaceId ? `ws-${workspaceId}-` : '';
    cb(null, `${workspacePrefix}${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer for photo uploads specifically
export const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure photos directory exists
    if (!fs.existsSync('uploads/photos/')) {
      fs.mkdirSync('uploads/photos/', { recursive: true });
    }
    const requestId = req.headers['x-request-id'];
    if (requestId && process.env.NODE_ENV !== 'production') {
      console.debug(`Photo upload request ${requestId} for ${file.originalname}`);
    }
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename for photos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const workspaceId = (req as any).workspaceId;
    const workspacePrefix = workspaceId ? `ws-${workspaceId}-` : '';
    cb(null, `${workspacePrefix}photo-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
export const imageFileFilter = (req: Request, file: MulterFile, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Blocked non-image upload from ${req.ip}: ${file.mimetype}`);
    }
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter for resumes and documents
export const documentFileFilter = (req: Request, file: MulterFile, cb: FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Blocked document upload from ${req.ip}: ${file.mimetype}`);
    }
    cb(new Error('Only PDF, Word, text files and images are allowed!'));
  }
};

// Export configured multer instances
export const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for photos
  }
});

export const uploadDocument = multer({
  storage: diskStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  }
});
