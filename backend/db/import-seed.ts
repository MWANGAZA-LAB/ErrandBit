/**
 * Import Seed Data
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: 'postgresql://postgres:newpassword@localhost:5432/errandbit'
});

async function importSeedData() {
  try {
    console.log('📦 Importing seed data...\n');

    const seedPath = path.join(__dirname, 'seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');

    await pool.query(seedSQL);

    console.log('✅ Seed data imported successfully!\n');

    // Display what was imported
    const users = await pool.query('SELECT id, role, email FROM users ORDER BY id');
    console.log('👥 Users:');
    users.rows.forEach(row => {
      console.log(`   ${row.id}. ${row.role.toUpperCase()}: ${row.email}`);
    });

    const runners = await pool.query('SELECT user_id, display_name, lightning_address, avg_rating FROM runner_profiles ORDER BY user_id');
    console.log('\n⚡ Runner Profiles:');
    runners.rows.forEach(row => {
      console.log(`   ${row.display_name} (User ${row.user_id})`);
      console.log(`      Lightning: ${row.lightning_address || 'None'}`);
      console.log(`      Rating: ${row.avg_rating}★`);
    });

    const jobs = await pool.query('SELECT id, title, price_cents, status FROM jobs ORDER BY id');
    console.log('\n💼 Jobs:');
    jobs.rows.forEach(row => {
      console.log(`   ${row.id}. ${row.title} - $${(row.price_cents/100).toFixed(2)} (${row.status})`);
    });

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

importSeedData();
