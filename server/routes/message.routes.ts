import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';
import { logger } from '../lib/logger';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        // getConversationsByUser is the correct method name in storage
        const conversations = await storage.getConversationsByUser(userId, req.workspaceId);
        res.json(conversations);
    } catch (error) {
        logger.error('Failed to fetch conversations', { error, userId: req.user?.id });
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get messages in a conversation with specific user
router.get('/conversation/:receiverId', requireAuth, async (req, res) => {
    try {
        const senderId = req.user!.id;
        const receiverId = parseInt(req.params.receiverId);

        // getMessagesBetweenUsers takes only 2 args per storage interface
        const messages = await storage.getMessagesBetweenUsers(senderId, receiverId, req.workspaceId);
        res.json(messages);
    } catch (error) {
        logger.error('Failed to fetch messages', { error, userId: req.user?.id, otherUserId: req.params.receiverId });
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Backward compatible route for conversation messages
router.get('/:receiverId', requireAuth, async (req, res) => {
    try {
        const senderId = req.user!.id;
        const receiverId = parseInt(req.params.receiverId);

        const messages = await storage.getMessagesBetweenUsers(senderId, receiverId, req.workspaceId);
        res.json(messages);
    } catch (error) {
        logger.error('Failed to fetch messages', { error, userId: req.user?.id, otherUserId: req.params.receiverId });
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/', requireAuth, async (req, res) => {
    try {
        const { receiverId, content } = req.body;

        if (!receiverId || !content) {
            return res.status(400).json({ error: 'Receiver and content are required' });
        }

        const message = await storage.createMessage({
            senderId: req.user!.id,
            receiverId: parseInt(receiverId),
            content,
            isRead: false,
        });

        // Send real-time notification to receiver via WebSocket
        broadcastToClients({
            type: 'NEW_MESSAGE',
            data: message,
            recipientId: parseInt(receiverId),
        });

        res.json(message);
    } catch (error) {
        logger.error('Error sending message', { error, senderId: req.user?.id });
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark message as read
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const message = await storage.markMessageAsRead(id, req.user!.id);

        broadcastToClients({
            type: 'MESSAGE_READ',
            data: message,
        });

        res.json(message);
    } catch (error) {
        logger.error('Error marking message as read', { error, messageId: req.params.id });
        res.status(500).json({ error: 'Failed to update message' });
    }
});

export default router;
