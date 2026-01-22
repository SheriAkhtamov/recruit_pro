import { Router, static as expressStatic } from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const uploadsRoot = path.resolve(process.cwd(), 'uploads');

const resolveSafeUploadPath = (subDir: string, filename: string) => {
    const safeName = path.basename(filename);
    if (safeName !== filename) {
        return null;
    }
    const resolved = path.resolve(uploadsRoot, subDir, safeName);
    if (!resolved.startsWith(path.resolve(uploadsRoot, subDir))) {
        return null;
    }
    return resolved;
};

// Serve photo files
router.get('/photos/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = resolveSafeUploadPath('photos', filename);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Photo not found' });
    }

    res.sendFile(filePath);
});

// Serve general files (documents, resumes, etc.)
router.get('/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = resolveSafeUploadPath('', filename);

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
});

// Static file serving for uploads directory
export const uploadsMiddleware = expressStatic('uploads', {
    index: false,
    dotfiles: 'deny',
    redirect: false,
});

export default router;
