import session from "express-session";
import MemoryStore from "memorystore";

// Use memory store since Redis is optional and may not be installed
const MemoryStoreSession = MemoryStore(session);

// Session configuration - using memory store for now
// Redis can be added later by installing 'redis' and 'connect-redis' packages
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
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
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
