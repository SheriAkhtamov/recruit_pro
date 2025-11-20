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
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
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

        cb(null, isAllowed);
    },
});

// Configure multer for photo uploads specifically
export const photoStorage = multer.diskStorage({
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

        cb(null, isAllowed);
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
        },
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
