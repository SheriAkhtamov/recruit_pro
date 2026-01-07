import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logger } from './lib/logger';
import * as schema from "@shared/schema";

// Note: DATABASE_URL is validated in index.ts with fail-fast behavior.
if (!process.env.DATABASE_URL) {
  logger.error('❌ DATABASE_URL is not set. Please configure it in your environment.');
  throw new Error('DATABASE_URL is not set');
}

let pool: Pool;
let db: NodePgDatabase<typeof schema>;

try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Connection pool settings
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
  });

  db = drizzle(pool, { schema });

  // Test connection on startup
  pool.on('connect', () => {
    // Database connection established
  });

  pool.on('error', (err: Error) => {
    logger.error('💥 Unexpected database error:', err);
  });
} catch (error) {
  logger.error('❌ Failed to initialize database connection:', error);
  throw error;
}

export { pool, db };
