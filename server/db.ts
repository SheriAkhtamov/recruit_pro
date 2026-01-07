import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logger } from './lib/logger';
import * as schema from "@shared/schema";

// Note: DATABASE_URL is now validated in index.ts with fail-fast behavior
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to initialize the database connection.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
});

const db = drizzle(pool, { schema });

// Test connection on startup
pool.on('connect', () => {
  // Database connection established
});

pool.on('error', (err: Error) => {
  logger.error('💥 Unexpected database error:', err);
});

export const getPool = (): Pool => pool;
export const getDb = (): NodePgDatabase<typeof schema> => db;

export { pool, db };
