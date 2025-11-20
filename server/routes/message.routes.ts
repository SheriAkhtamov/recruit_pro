import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// WebSocket broadcast function (will be injected)
let broadcastToClients: (data: any) => void = () => { };

export function setBroadcastFunction(fn: (data: any) => void) {
    broadcastToClients = fn;
}

// Get all conversations for current user
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.user!.id;
        const conversations = await storage.getConversations(userId, req.workspaceId);
        res.json(conversations);
    } catch (error) {
        console.error('Failed to fetch conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get messages in a conversation with specific user
router.get('/conversation/:receiverId', requireAuth, async (req, res) => {
    try {
        const senderId = req.session!.user!.id;
        const receiverId = parseInt(req.params.receiverId);

        const messages = await storage.getMessagesBetweenUsers(senderId, receiverId, req.workspaceId);
        res.json(messages);
    } catch (error) {
        console.error('Failed to fetch messages:', error);
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
            senderId: req.session!.user!.id,
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
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark message as read
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const message = await storage.updateMessage(id, { isRead: true });

        broadcastToClients({
            type: 'MESSAGE_READ',
            data: message,
        });

        res.json(message);
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});

export default router;
