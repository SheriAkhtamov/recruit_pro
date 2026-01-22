import multer from 'multer';
import fs from 'fs';
import path from 'path';

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
    },
});

export const upload = multer({
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
        if (!isAllowed && process.env.NODE_ENV !== 'production') {
            console.debug(`Rejected upload from ${req.ip} with type ${file.mimetype}`);
        }

        if (!isAllowed) {
            return cb(new Error('Unsupported file type'));
        }
        cb(null, true);
    },
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
    },
});

// Multer configuration specifically for photos
export const uploadPhoto = multer({
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
        if (!isAllowed && process.env.NODE_ENV !== 'production') {
            console.debug(`Rejected photo upload from ${req.ip} with type ${file.mimetype}`);
        }

        if (!isAllowed) {
            return cb(new Error('Unsupported file type'));
        }
        cb(null, true);
    },
});

// Custom multer configuration for documentation candidates (photos + documents)
export const documentationUpload = multer({
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
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`Documentation upload from ${req.ip} for ${file.fieldname}`);
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            const workspaceId = (req as any).workspaceId;
            const workspacePrefix = workspaceId ? `ws-${workspaceId}-` : '';

            if (file.fieldname === 'photo') {
                cb(null, `${workspacePrefix}photo-${uniqueSuffix}${ext}`);
            } else {
                const baseName = path.basename(file.originalname, ext);
                cb(null, `${workspacePrefix}${baseName}-${uniqueSuffix}${ext}`);
            }
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'photo') {
            const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            const isAllowed = allowedPhotoTypes.includes(file.mimetype);
            if (!isAllowed) {
                return cb(new Error('Unsupported file type'));
            }
            cb(null, true);
        } else {
            const allowedDocTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/jpeg', 'image/jpg', 'image/png',
                'text/plain'
            ];
            const isAllowed = allowedDocTypes.includes(file.mimetype);
            if (!isAllowed && process.env.NODE_ENV !== 'production') {
                console.debug(`Rejected documentation upload from ${req.ip} with type ${file.mimetype}`);
            }
            if (!isAllowed) {
                return cb(new Error('Unsupported file type'));
            }
            cb(null, true);
        }
    },
});
