/**
 * Run Migration 007: Add Profile Features
 * This migration adds Lightning address, avatar upload, theme preferences,
 * and security audit logging functionality.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, '..', '.env') });

async function runMigration() {
  // Parse DATABASE_URL if available
  const databaseUrl = process.env.DATABASE_URL;
  let connectionConfig;

  if (databaseUrl) {
    // Parse postgresql://user:password@host:port/database
    const url = new URL(databaseUrl);
    connectionConfig = {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.slice(1), // Remove leading /
      user: url.username,
      password: url.password,
    };
  } else {
    connectionConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'errandbit',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
  }

  const pool = new Pool(connectionConfig);

  try {
    console.log('🚀 Starting Migration 007: Add Profile Features...');
    console.log('Database:', connectionConfig.database);
    console.log('Host:', connectionConfig.host);
    console.log('Port:', connectionConfig.port);

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '007_add_profile_features.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration 007 completed successfully!');
    console.log('\nAdded features:');
    console.log('  - Lightning address for receiving payments');
    console.log('  - Avatar upload tracking');
    console.log('  - Theme preferences (light/dark/system)');
    console.log('  - Email and 2FA fields');
    console.log('  - User preferences table');
    console.log('  - User avatars table');
    console.log('  - Security audit log table');

    // Verify tables exist
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('user_preferences', 'user_avatars', 'security_audit_log')
      ORDER BY table_name
    `);

    console.log('\n✓ Verified tables:');
    tableCheck.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    // Verify columns added to users table
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN (
          'lightning_address', 'avatar_url', 'theme_preference', 
          'email', 'email_verified', 'two_factor_enabled', 
          'two_factor_secret', 'last_password_change'
        )
      ORDER BY column_name
    `);

    console.log('\n✓ Verified columns in users table:');
    columnCheck.rows.forEach((row) => {
      console.log(`  - ${row.column_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
