import { Express, Request, Response, NextFunction } from 'express';
import type { Server } from 'http';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import { pool } from '../db';
import userRoutes from './user.routes';
import vacancyRoutes from './vacancy.routes';
import candidateRoutes from './candidate.routes';
import interviewRoutes from './interview.routes';
import interviewStageRoutes from './interview-stage.routes';
import documentationRoutes from './documentation.routes';
import analyticsRoutes from './analytics.routes';
import superAdminRoutes from './super-admin.routes';
import authRoutes from './auth.routes';
import fileRoutes, { uploadsMiddleware } from './file.routes';
import messageRoutes from './message.routes';
import departmentRoutes from './department.routes';
import { logger } from '../lib/logger';

// Import broadcast setters
import { setBroadcastFunction as setCandidateBroadcast } from './candidate.routes';
import { setBroadcastFunction as setVacancyBroadcast } from './vacancy.routes';
import { setBroadcastFunction as setInterviewBroadcast } from './interview.routes';
import { setBroadcastFunction as setInterviewStageBroadcast } from './interview-stage.routes';
import { setBroadcastFunction as setDocumentationBroadcast } from './documentation.routes';
import { setBroadcastFunction as setMessageBroadcast } from './message.routes';

const PgStore = pgSession(session);

const buildSessionConfig = () => {
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
        logger.error('SESSION_SECRET is required to start the server.');
        process.exit(1);
    }

    if (!pool) {
        logger.error('Database pool is not initialized for session storage.');
        process.exit(1);
    }

    // Session configuration with PostgreSQL store
    return {
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        name: 'connect.sid',
        store: new PgStore({
            pool,
            tableName: 'session',
            createTableIfMissing: true, // Auto-create session table
        }),
        cookie: {
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax' as const,
            domain: undefined,
            path: '/',
        },
    };
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
    app.use(session(buildSessionConfig()));

    // NOTE: Mock mode backdoor removed for security. 
    // Server now requires DATABASE_URL to be set.

    // Register route modules
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/vacancies', vacancyRoutes);
    app.use('/api/candidates', candidateRoutes);
    app.use('/api/interviews', interviewRoutes);
    app.use('/api/interview-stages', interviewStageRoutes);
    app.use('/api/departments', departmentRoutes);
    app.use('/api/documentation', documentationRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/super-admin', superAdminRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/uploads', uploadsMiddleware);

    const httpServer = createServer(app);

    // WebSocket setup
    const wss = new WebSocket.WebSocketServer({ server: httpServer });
    const clients = new Set<any>(); // Using any here because ws type definition might be tricky without direct import

    wss.on('connection', (ws: any) => {
        clients.add(ws);

        ws.on('close', () => {
            clients.delete(ws);
        });

        ws.on('error', (error: Error) => {
            logger.error('WebSocket error:', error);
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
    setInterviewStageBroadcast(broadcastToClients);
    setDocumentationBroadcast(broadcastToClients);
    setMessageBroadcast(broadcastToClients);

    return httpServer;
}

export default registerModularRoutes;
