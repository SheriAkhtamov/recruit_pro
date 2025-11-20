import session from "express-session";
import { createClient } from "redis";

// Redis client for session storage (if Redis is available)
let redisClient: any = null;

try {
  redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  
  redisClient.on("error", (err: any) => {
    console.warn("Redis connection error, falling back to memory storage:", err);
  });
  
  redisClient.connect().catch(() => {
    console.warn("Failed to connect to Redis, using memory storage");
    redisClient = null;
  });
} catch (error) {
  console.warn("Redis not available, using memory storage");
}

// Session configuration
export const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "recruitment-tracker-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
  },
  store: redisClient 
    ? (require("connect-redis")(session)({ client: redisClient }))
    : undefined, // Use memory storage if Redis is not available
};

// Development session configuration (more lenient)
export const devSessionConfig: session.SessionOptions = {
  ...sessionConfig,
  cookie: {
    ...sessionConfig.cookie,
    secure: false, // Allow HTTP in development
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in development
  },
};

// Production session configuration (more secure)
export const prodSessionConfig: session.SessionOptions = {
  ...sessionConfig,
  cookie: {
    ...sessionConfig.cookie,
    secure: true, // Require HTTPS in production
    maxAge: 12 * 60 * 60 * 1000, // 12 hours in production
    domain: process.env.COOKIE_DOMAIN,
  },
};

// Get appropriate session config based on environment
export const getSessionConfig = (): session.SessionOptions => {
  if (process.env.NODE_ENV === "production") {
    return prodSessionConfig;
  } else if (process.env.NODE_ENV === "development") {
    return devSessionConfig;
  }
  return sessionConfig;
};
