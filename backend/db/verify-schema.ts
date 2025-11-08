/**
 * Database Schema Verification Script
 * Verifies that the database schema is correctly set up
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

interface Checks {
  passed: string[];
  failed: string[];
  warnings: string[];
}

const checks: Checks = {
  passed: [],
  failed: [],
  warnings: []
};

async function verifyExtensions(): Promise<void> {
  console.log('\n1. Checking PostgreSQL extensions...');
  
  try {
    const result = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'postgis';
    `);
    
    if (result.rows.length > 0) {
      checks.passed.push(`PostGIS extension installed (version ${result.rows[0].extversion})`);
      console.log('   ✓ PostGIS extension found');
    } else {
      checks.failed.push('PostGIS extension not installed');
      console.log('   ✗ PostGIS extension missing');
    }
  } catch (error) {
    checks.failed.push(`Extension check failed: ${(error as Error).message}`);
    console.log('   ✗ Error checking extensions');
  }
}

async function verifyTables(): Promise<void> {
  console.log('\n2. Checking required tables...');
  
  const requiredTables = [
    'users',
    'runner_profiles',
    'jobs',
    'messages',
    'reviews',
    'trust_tiers',
    'subscriptions',
    'boosts',
    'disputes',
    'bonds'
  ];
  
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    
    const existingTables = result.rows.map(row => row.tablename);
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        checks.passed.push(`Table '${table}' exists`);
        console.log(`   ✓ ${table}`);
      } else {
        checks.failed.push(`Table '${table}' missing`);
        console.log(`   ✗ ${table} (missing)`);
      }
    }
  } catch (error) {
    checks.failed.push(`Table check failed: ${(error as Error).message}`);
    console.log('   ✗ Error checking tables');
  }
}

async function verifyUsersTable(): Promise<void> {
  console.log('\n3. Checking users table schema...');
  
  const requiredColumns = [
    { name: 'id', type: 'integer' },
    { name: 'role', type: 'character varying' },
    { name: 'phone', type: 'character varying' },
    { name: 'email', type: 'character varying' },
    { name: 'nostr_pubkey', type: 'character varying' },
    { name: 'auth_method', type: 'character varying' },
    { name: 'created_at', type: 'timestamp without time zone' }
  ];
  
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    const existingColumns = result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES'
    }));
    
    for (const required of requiredColumns) {
      const found = existingColumns.find(col => col.name === required.name);
      if (found) {
        checks.passed.push(`Column 'users.${required.name}' exists`);
        console.log(`   ✓ ${required.name} (${found.type})`);
        
        // Special check for Nostr pubkey
        if (required.name === 'nostr_pubkey') {
          console.log('     → Nostr identity support enabled');
        }
      } else {
        checks.failed.push(`Column 'users.${required.name}' missing`);
        console.log(`   ✗ ${required.name} (missing)`);
      }
    }
  } catch (error) {
    checks.failed.push(`Users table check failed: ${(error as Error).message}`);
    console.log('   ✗ Error checking users table');
  }
}

async function verifyIndexes(): Promise<void> {
  console.log('\n4. Checking database indexes...');
  
  const requiredIndexes = [
    'idx_users_phone',
    'idx_users_email',
    'idx_users_nostr_pubkey',
    'idx_runner_profiles_location',
    'idx_jobs_status'
  ];
  
  try {
    const result = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public';
    `);
    
    const existingIndexes = result.rows.map(row => row.indexname);
    
    for (const index of requiredIndexes) {
      if (existingIndexes.includes(index)) {
        checks.passed.push(`Index '${index}' exists`);
        console.log(`   ✓ ${index}`);
      } else {
        checks.warnings.push(`Index '${index}' missing (recommended for performance)`);
        console.log(`   ⚠ ${index} (missing)`);
      }
    }
  } catch (error) {
    checks.warnings.push(`Index check failed: ${(error as Error).message}`);
    console.log('   ⚠ Error checking indexes');
  }
}

async function verifyConstraints(): Promise<void> {
  console.log('\n5. Checking database constraints...');
  
  try {
    const result = await pool.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
      AND contype IN ('c', 'f', 'u');
    `);
    
    const constraints = result.rows;
    const checkConstraints = constraints.filter(c => c.contype === 'c');
    const foreignKeys = constraints.filter(c => c.contype === 'f');
    const uniqueConstraints = constraints.filter(c => c.contype === 'u');
    
    console.log(`   ✓ ${checkConstraints.length} check constraints`);
    console.log(`   ✓ ${foreignKeys.length} foreign keys`);
    console.log(`   ✓ ${uniqueConstraints.length} unique constraints`);
    
    checks.passed.push(`Database has ${constraints.length} constraints`);
    
    // Check for auth_method_check constraint
    const authCheck = checkConstraints.find(c => c.conname === 'auth_method_check');
    if (authCheck) {
      console.log('   ✓ auth_method_check constraint found (ensures valid authentication)');
      checks.passed.push('Authentication method constraint exists');
    } else {
      checks.warnings.push('auth_method_check constraint missing');
      console.log('   ⚠ auth_method_check constraint missing');
    }
  } catch (error) {
    checks.warnings.push(`Constraint check failed: ${(error as Error).message}`);
    console.log('   ⚠ Error checking constraints');
  }
}

async function testConnection(): Promise<void> {
  console.log('\n6. Testing database connection...');
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    checks.passed.push('Database connection successful');
    console.log('   ✓ Connection successful');
    console.log(`   → PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
  } catch (error) {
    checks.failed.push(`Connection failed: ${(error as Error).message}`);
    console.log('   ✗ Connection failed');
  }
}

async function printSummary(): Promise<boolean> {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✓ Passed: ${checks.passed.length}`);
  checks.passed.forEach(check => console.log(`  - ${check}`));
  
  if (checks.warnings.length > 0) {
    console.log(`\n⚠ Warnings: ${checks.warnings.length}`);
    checks.warnings.forEach(check => console.log(`  - ${check}`));
  }
  
  if (checks.failed.length > 0) {
    console.log(`\n✗ Failed: ${checks.failed.length}`);
    checks.failed.forEach(check => console.log(`  - ${check}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (checks.failed.length === 0) {
    console.log('\n✓ Database schema verification PASSED');
    console.log('Your database is ready for ErrandBit!\n');
    return true;
  } else {
    console.log('\n✗ Database schema verification FAILED');
    console.log('Please run migrations: npm run migrate\n');
    return false;
  }
}

async function main(): Promise<void> {
  console.log('ErrandBit Database Schema Verification');
  console.log('=' + '='.repeat(59));
  
  if (!process.env['DATABASE_URL']) {
    console.error('\n✗ DATABASE_URL not set in environment');
    console.error('Please create backend/.env file with DATABASE_URL\n');
    process.exit(1);
  }
  
  console.log(`\nDatabase: ${process.env['DATABASE_URL'].replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    await testConnection();
    await verifyExtensions();
    await verifyTables();
    await verifyUsersTable();
    await verifyIndexes();
    await verifyConstraints();
    
    const success = await printSummary();
    
    await pool.end();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Verification failed with error:', (error as Error).message);
    await pool.end();
    process.exit(1);
  }
}

main();
