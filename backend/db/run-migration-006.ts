/**
 * Run Migration 006: Runner Payouts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'errandbit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'newpassword',
});

async function runMigration() {
  try {
    console.log('Running migration 006: Add Runner Payouts...');

    const migrationPath = path.join(__dirname, 'migrations', '006_add_runner_payouts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(migrationSQL);

    console.log('Migration 006 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
