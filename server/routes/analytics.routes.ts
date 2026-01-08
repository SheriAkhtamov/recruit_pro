import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAnalyticsAccess } from '../middleware/auth.middleware';
import { logger } from '../lib/logger';

const router = Router();

router.use(requireAuth);

// Get dashboard statistics
router.get('/dashboard', requireAnalyticsAccess, async (req, res) => {
    try {
        const workspaceId = req.workspaceId;

        const [
            activeVacancies,
            activeCandidates,
            monthlyInterviews,
            hiredThisMonth,
            documentationCandidates
        ] = await Promise.all([
            storage.getVacancies(workspaceId).then(v => v.filter((vac: any) => vac.status === 'active').length),
            storage.getCandidates(workspaceId).then(c => c.filter((can: any) => can.status === 'active').length),
            storage.getInterviews(workspaceId).then(i => {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return i.filter((int: any) => new Date(int.scheduledAt) >= startOfMonth).length;
            }),
            storage.getCandidates(workspaceId).then(c => {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return c.filter((can: any) =>
                    can.status === 'hired' && new Date(can.updatedAt) >= startOfMonth
                ).length;
            }),
            storage.getCandidatesByStatus('documentation', workspaceId).then(c => c.length)
        ]);

        res.json({
            activeVacancies,
            activeCandidates,
            monthlyInterviews,
            hiredThisMonth,
            documentationCandidates
        });
    } catch (error) {
        logger.error('Failed to fetch dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get conversion funnel data
router.get('/funnel', requireAnalyticsAccess, async (req, res) => {
    try {
        const funnel = await storage.getConversionFunnel(req.workspaceId!);
        res.json(funnel);
    } catch (error) {
        logger.error('Failed to fetch funnel data:', error);
        res.status(500).json({ error: 'Failed to fetch funnel data' });
    }
});

// Get rejections by stage
router.get('/rejections-by-stage', requireAnalyticsAccess, async (req, res) => {
    try {
        const rejections = await storage.getRejectionsByStage(req.workspaceId!);
        res.json(rejections);
    } catch (error) {
        logger.error('Failed to fetch rejection stats:', error);
        res.status(500).json({ error: 'Failed to fetch rejection statistics' });
    }
});

// Get hired and dismissed statistics
router.get('/hired-dismissed-stats', requireAnalyticsAccess, async (req, res) => {
    try {
        const stats = await storage.getHiredAndDismissedStats(req.workspaceId!);
        res.json(stats);
    } catch (error) {
        logger.error('Failed to fetch hire/dismissal stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get monthly hire/dismissal trends
router.get('/hired-dismissed-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
        const monthlyStats = await storage.getHiredAndDismissedStatsByMonth(req.workspaceId!);
        res.json(monthlyStats);
    } catch (error) {
        logger.error('Failed to fetch monthly stats:', error);
        res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
});

// Get yearly hire/dismissal trends
router.get('/hired-dismissed-by-year', requireAnalyticsAccess, async (req, res) => {
    try {
        const yearlyStats = await storage.getHiredAndDismissedStatsByYear(req.workspaceId!);
        res.json(yearlyStats);
    } catch (error) {
        logger.error('Failed to fetch yearly stats:', error);
        res.status(500).json({ error: 'Failed to fetch yearly statistics' });
    }
});

// Get dashboard stats for specific month
router.get('/monthly-dashboard', requireAnalyticsAccess, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        const stats = await storage.getDashboardStatsByMonth(
            req.workspaceId!,
            month as string,
            year as string
        );

        res.json(stats);
    } catch (error) {
        logger.error('Failed to fetch monthly dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
});

export default router;
