/**
 * Quick migration script to add role column
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:newpassword@localhost:5432/errandbit';

async function runMigration() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');
    
    console.log('📝 Reading migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '../db/migrations/003_add_role_column.sql'),
      'utf-8'
    );
    
    console.log('🚀 Applying migration: Add role column...');
    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully!');
    
    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: role column exists');
      console.log('   Column details:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
