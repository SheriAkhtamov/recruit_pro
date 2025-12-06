import 'dotenv/config';
import express, { type Request, type Response, NextFunction } from "express";
import morgan from 'morgan';
import { registerModularRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, checkDatabaseConnection } from "./initDatabase";
import { globalMutationLimiter, readLimiter } from './middleware/rateLimiter';
import { logger } from './lib/logger';

// FAIL-FAST: Server requires DATABASE_URL to be set
if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL is not set in environment variables.');
  console.error('   Please set DATABASE_URL in .env file for the server to start.');
  process.exit(1);
}

const app = express();

// Trust proxy for secure cookies behind reverse proxy (Nginx, Cloudflare, etc.)
app.set('trust proxy', 1);

// CORS configuration
app.use((req, res, next) => {
  // In production, restrict to specific origins
  const allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    process.env.APP_URL,
  ].filter(Boolean);

  const origin = req.headers.origin;

  // In development, allow all origins. In production, only allow specific origins
  const isDevelopment = app.get('env') === 'development';
  if (isDevelopment || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, x-bot-token');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting middleware - защита от DDoS
// Disabled in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting in development
  if (isDevelopment) {
    return next();
  }

  // Применяем разные лимиты в зависимости от метода
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return globalMutationLimiter(req, res, next);
  } else if (req.method === 'GET') {
    return readLimiter(req, res, next);
  }
  next();
});

// Request logging with morgan (replaces monkey-patched res.json)
// Custom format that logs API requests
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return typeof responseTime === 'string' ? responseTime : '-';
});

app.use(morgan(':method :url :status :response-time ms', {
  stream: { write: (message: string) => logger.info(message.trim()) },
  skip: (req) => !req.path.startsWith('/api'),
}));

(async () => {
  // Initialize database with schema and default data
  log("🔍 Checking database connection...");
  const isConnected = await checkDatabaseConnection();

  if (isConnected) {
    log("✅ Database connection successful");
    log("🔧 Initializing database schema and data...");
    await initializeDatabase();
  } else {
    log("❌ Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.");
    process.exit(1);
  }

  // Use new modular routes
  const server = await registerModularRoutes(app);

  // Global error handler with logging
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error for debugging
    logger.error('Server Error', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
    });

    res.status(status).json({ message });
  });

  // Setup vite in development, serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server configuration
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || "0.0.0.0";

  server.listen({
    port,
    host,
  }, () => {
    log(`🚀 Server running on http://${host}:${port}`);
    if (host === "0.0.0.0") {
      log(`📡 Accessible from network on port ${port}`);
    }
  });
})();
