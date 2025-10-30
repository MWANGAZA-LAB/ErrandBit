import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const pool = getPool();
  if (!pool) {
    console.error('DATABASE_URL not set. Cannot run migrations.');
    process.exit(1);
  }

  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
