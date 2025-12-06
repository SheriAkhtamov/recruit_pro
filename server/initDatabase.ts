import { db, pool } from './db';
import { logger } from './lib/logger';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

// SQL script for creating all necessary tables
const createTablesSQL = `
-- Cognix Hire Database Schema
-- This script creates all necessary tables for the multi-workspace recruitment system

-- Create workspaces table (companies/work areas)
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    date_of_birth TIMESTAMP,
    position VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    has_report_access BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, email)
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, name)
);

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    location VARCHAR(255),
    description TEXT,
    requirements TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    hired_candidate_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    city VARCHAR(255),
    vacancy_id INTEGER REFERENCES vacancies(id),
    resume_url TEXT,
    resume_filename VARCHAR(255),
    photo_url TEXT,
    source VARCHAR(100),
    interview_stage_chain JSONB,
    current_stage_index INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    rejection_reason TEXT,
    rejection_stage INTEGER,
    dismissal_reason TEXT,
    dismissal_date TIMESTAMP,
    parsed_resume_data JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_stages table
CREATE TABLE IF NOT EXISTS interview_stages (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id),
    stage_index INTEGER NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    interviewer_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP,
    completed_at TIMESTAMP,
    comments TEXT,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    stage_id INTEGER REFERENCES interview_stages(id),
    candidate_id INTEGER REFERENCES candidates(id),
    interviewer_id INTEGER REFERENCES users(id),
    scheduled_at TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled',
    meeting_link TEXT,
    notes TEXT,
    outcome VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, key)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy_id ON candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_interview_stages_candidate_id ON interview_stages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
`;

// SQL script for adding foreign key constraints that need to be added after table creation
const addConstraintsSQL = `
-- Add foreign key constraint for hired_candidate_id after candidates table is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_vacancies_hired_candidate'
    ) THEN
        ALTER TABLE vacancies 
        ADD CONSTRAINT fk_vacancies_hired_candidate 
        FOREIGN KEY (hired_candidate_id) REFERENCES candidates(id);
    END IF;
END $$;
`;

// SQL script for inserting default data
const insertDefaultDataSQL = async (pool: any) => {
  // Create default super admin (Sheri) - only if SUPER_ADMIN_PASSWORD is set
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    logger.warn('⚠️  SUPER_ADMIN_PASSWORD not set in .env file');
    return;
  }

  const hashedSuperAdminPassword = await bcrypt.hash(superAdminPassword, 10);

  try {
    // Use ON CONFLICT to UPDATE password if super admin already exists
    // This ensures the password from .env is always used
    const result = await pool.query(`
      INSERT INTO super_admins (username, password, full_name, is_active) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET password = $2
      RETURNING id, username;
    `, ['Sheri', hashedSuperAdminPassword, 'Sheri Super Admin', true]);

    if (result.rows.length > 0) {
      logger.info('✅ Super admin ready (username: Sheri)');
    }
  } catch (error: any) {
    logger.error('❌ Error creating super admin:', error.message);
    throw error;
  }

  // Note: Workspaces and users will be created through the API, not here
  // This allows super admin to create workspaces with proper setup
};

export async function initializeDatabase(): Promise<void> {
  if (!pool) {
    return;
  }

  try {
    // First, add missing columns to existing tables
    await updateExistingTables();

    // Create all tables
    await pool.query(createTablesSQL);

    // Add foreign key constraints
    await pool.query(addConstraintsSQL);

    // Insert default data
    await insertDefaultDataSQL(pool);

    // Test the connection
    const result = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
  } catch (error: any) {
    logger.error("❌ Database initialization failed:");
    logger.error("Error details:", error.message);
    logger.error("Error code:", error.code);

    // Don't throw error to prevent server from crashing
    // Just log the error and continue
  }
}

async function updateExistingTables(): Promise<void> {
  try {
    // Add workspaces table if it doesn't exist
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add super_admins table if it doesn't exist
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add workspace_id to users if it doesn't exist
    await pool!.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='users' AND column_name='workspace_id') THEN
          -- Create a default workspace first
          INSERT INTO workspaces (name) VALUES ('Default Workspace') ON CONFLICT DO NOTHING;
          
          ALTER TABLE users ADD COLUMN workspace_id INTEGER;
          UPDATE users SET workspace_id = (SELECT id FROM workspaces LIMIT 1);
          ALTER TABLE users ALTER COLUMN workspace_id SET NOT NULL;
          ALTER TABLE users ADD CONSTRAINT fk_users_workspace 
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
          ALTER TABLE users ADD CONSTRAINT users_workspace_email_unique UNIQUE(workspace_id, email);
        END IF;
      END $$;
    `);

    // Add workspace_id to other tables if they don't exist
    const tables = ['vacancies', 'candidates', 'departments', 'system_settings'];
    for (const table of tables) {
      await pool!.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='${table}' AND column_name='workspace_id') THEN
            ALTER TABLE ${table} ADD COLUMN workspace_id INTEGER;
            UPDATE ${table} SET workspace_id = (SELECT id FROM workspaces LIMIT 1);
            ALTER TABLE ${table} ALTER COLUMN workspace_id SET NOT NULL;
            ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_workspace 
              FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
    }

    // Make email column nullable for candidates without email
    await pool!.query(`
      ALTER TABLE candidates 
      ALTER COLUMN email DROP NOT NULL;
    `).catch(() => { }); // Ignore if already nullable

    // Update departments unique constraint
    await pool!.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='departments_name_unique') THEN
          ALTER TABLE departments DROP CONSTRAINT departments_name_unique;
          ALTER TABLE departments ADD CONSTRAINT departments_workspace_name_unique 
            UNIQUE(workspace_id, name);
        END IF;
      END $$;
    `).catch(() => { });

    // Update system_settings unique constraint
    await pool!.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name='system_settings_key_unique') THEN
          ALTER TABLE system_settings DROP CONSTRAINT system_settings_key_unique;
          ALTER TABLE system_settings ADD CONSTRAINT system_settings_workspace_key_unique 
            UNIQUE(workspace_id, key);
        END IF;
      END $$;
    `).catch(() => { });

  } catch (error) {
    // Don't throw - this is expected if tables don't exist yet
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    return false;
  }

  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error("Database connection check failed:", error);
    return false;
  }
}