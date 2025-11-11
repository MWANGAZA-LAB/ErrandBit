/**
 * Apply Multi-Wallet Payment Migrations
 * Applies migrations 004 and 005 for multi-wallet payment support
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigrations() {
  // Use DATABASE_URL if available, otherwise construct from individual vars
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'errandbit'}`;
  
  const client = new pg.Client({
    connectionString
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Apply migration 004: Add payment_method column
    console.log('\n📝 Applying migration 004: Add payment_method column...');
    const migration004 = readFileSync(
      join(__dirname, '..', 'db', 'migrations', '004_add_payment_method.sql'),
      'utf-8'
    );
    await client.query(migration004);
    console.log('✅ Migration 004 applied successfully');

    // Verify columns exist
    const verifyResult004 = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'lightning_transactions' 
        AND column_name IN ('payment_method', 'verification_level', 'payment_proof_image')
      ORDER BY column_name
    `);
    console.log('   Columns added:', verifyResult004.rows);

    // Apply migration 005: Enhance job status
    console.log('\n📝 Applying migration 005: Enhance job status flow...');
    const migration005 = readFileSync(
      join(__dirname, '..', 'db', 'migrations', '005_enhance_job_status.sql'),
      'utf-8'
    );
    await client.query(migration005);
    console.log('✅ Migration 005 applied successfully');

    // Verify constraint updated
    const verifyResult005 = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'jobs_status_check' AND conrelid = 'jobs'::regclass
    `);
    console.log('   Status constraint updated:');
    if (verifyResult005.rows.length > 0) {
      console.log('   ', verifyResult005.rows[0].definition.substring(0, 100) + '...');
    }

    console.log('\n🎉 All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigrations().catch(console.error);
