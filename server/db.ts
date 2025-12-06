import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { logger } from './lib/logger';
import * as schema from "@shared/schema";

// Note: DATABASE_URL is now validated in index.ts with fail-fast behavior

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

if (process.env.DATABASE_URL) {
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
    logger.warn('⚠️  Falling back to database-less mode');
    pool = null;
    db = null;
  }
} else {
  // Running in database-less mode for development
}

export { pool, db };