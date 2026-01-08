import { db, pool } from "./db";
import { logger } from "./lib/logger";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";

/**
 * Legacy seed function - now integrated into initializeDatabase
 * This function is kept for backward compatibility
 */
export async function seedDatabase() {
  if (!pool) {
    return;
  }

  try {
    if (!db) {
      logger.warn("Drizzle db instance not initialized for seed.");
    }
    logger.info(`Seeding schema tables: ${Object.keys(schema).length}`);

    // Hash passwords
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const hrPassword = await bcrypt.hash('hr123', 10);

    // Insert default users with hashed passwords
    await pool.query(`
      INSERT INTO users (workspace_id, email, password, full_name, role, is_active) 
      VALUES 
        (1, 'admin@recruitpro.com', $1, 'Administrator', 'admin', true),
        (1, 'hr@recruitpro.com', $2, 'HR Manager', 'hr_manager', true)
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        updated_at = CURRENT_TIMESTAMP
    `, [hashedPassword, hrPassword]);

  } catch (error: any) {
    logger.error("❌ Legacy seed failed:", error.message);
    // Don't throw to prevent server crash
  }
}
