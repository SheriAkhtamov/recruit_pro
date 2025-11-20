import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerModularRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, checkDatabaseConnection } from "./initDatabase";

const app = express();

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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with schema and default data
  if (process.env.DATABASE_URL) {
    log("🔍 Checking database connection...");
    const isConnected = await checkDatabaseConnection();

    if (isConnected) {
      log("✅ Database connection successful");
      log("🔧 Initializing database schema and data...");
      await initializeDatabase();
    } else {
      log("❌ Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.");
      log("⚠️  Server will continue in database-less mode.");
    }
  } else {
    log("⚠️  DATABASE_URL is not set. Skipping database initialization.");
    log("📖 Please set DATABASE_URL in .env file for full functionality.");
  }

  // Use new modular routes
  const server = await registerModularRoutes(app);

  // Global error handler with logging
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error for debugging
    console.error('❌ Server Error:', {
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
