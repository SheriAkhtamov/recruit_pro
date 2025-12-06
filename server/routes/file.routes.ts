import { Router, static as expressStatic } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Serve photo files
router.get('/photos/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', 'photos', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Photo not found' });
    }

    res.sendFile(filePath);
});

// Serve general files (documents, resumes, etc.)
router.get('/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);

    if (!fs.existsSync(filePath)) {
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
