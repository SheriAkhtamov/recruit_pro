import { Express } from 'express';
import { Server } from 'http';
import session from 'express-session';
import MemoryStore from 'memorystore';

// Import route modules
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import vacancyRoutes from './vacancy.routes';
import candidateRoutes from './candidate.routes';
import interviewRoutes from './interview.routes';
import documentationRoutes from './documentation.routes';
import analyticsRoutes from './analytics.routes';
import superAdminRoutes from './super-admin.routes';
import fileRoutes, { uploadsMiddleware } from './file.routes';
import messageRoutes from './message.routes';

// Import broadcast setters
import { setBroadcastFunction as setCandidateBroadcast } from './candidate.routes';
import { setBroadcastFunction as setVacancyBroadcast } from './vacancy.routes';
import { setBroadcastFunction as setInterviewBroadcast } from './interview.routes';
import { setBroadcastFunction as setDocumentationBroadcast } from './documentation.routes';
import { setBroadcastFunction as setMessageBroadcast } from './message.routes';

const MemoryStoreSession = MemoryStore(session);

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'recruit-pro-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' as const,
        domain: undefined,
        path: '/',
    },
};

/**
 * Register all application routes
 * 
 * ✨ New modular architecture where routes are separated by feature/domain
 * instead of having everything in one massive file (2844 lines → 11 modules)
 */
export async function registerModularRoutes(app: Express): Promise<Server> {
    const { createServer } = await import('http');
    const WebSocket = await import('ws');

    // Apply session middleware
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

    // Register route modules
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/vacancies', vacancyRoutes);
    app.use('/api/candidates', candidateRoutes);
    app.use('/api/interviews', interviewRoutes);
    app.use('/api/interview-stages', interviewRoutes); // stages are part of interviews module
    app.use('/api/documentation', documentationRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/super-admin', superAdminRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/uploads', uploadsMiddleware);

    const httpServer = createServer(app);

    // WebSocket setup
    const wss = new WebSocket.WebSocketServer({ server: httpServer });
    const clients = new Set();

    wss.on('connection', (ws: any) => {
        clients.add(ws);

        ws.on('close', () => {
            clients.delete(ws);
        });

        ws.on('error', (error: any) => {
            console.error('WebSocket error:', error);
            clients.delete(ws);
        });
    });

    // Broadcast function to send updates to all connected clients
    const broadcastToClients = (data: any) => {
        const message = JSON.stringify(data);
        clients.forEach((client: any) => {
            // Use numeric constant 1 for OPEN state (WebSocket.OPEN)
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    };

    // Inject broadcast function into route modules
    setCandidateBroadcast(broadcastToClients);
    setVacancyBroadcast(broadcastToClients);
    setInterviewBroadcast(broadcastToClients);
    setDocumentationBroadcast(broadcastToClients);
    setMessageBroadcast(broadcastToClients);

    return httpServer;
}

export default registerModularRoutes;
