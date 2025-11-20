/**
 * Query runner profiles from database
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'newpassword',
  database: process.env.DB_NAME || 'errandbit',
});

async function queryRunners() {
  try {
    console.log('Querying runner profiles...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        user_id, 
        display_name, 
        bio, 
        hourly_rate_cents,
        tags,
        completion_rate,
        avg_rating,
        total_jobs,
        created_at
      FROM runner_profiles
      ORDER BY id
    `);

    console.log(`\nFound ${result.rows.length} runner profiles:\n`);
    
    result.rows.forEach((runner, index) => {
      console.log(`${index + 1}. Runner ID: ${runner.id}`);
      console.log(`   User ID: ${runner.user_id}`);
      console.log(`   Name: ${runner.display_name}`);
      console.log(`   Bio: ${runner.bio || 'N/A'}`);
      console.log(`   Rate: $${(runner.hourly_rate_cents / 100).toFixed(2)}/hr`);
      console.log(`   Tags: ${runner.tags ? runner.tags.join(', ') : 'N/A'}`);
      console.log(`   Stats: ${runner.total_jobs} jobs, ${runner.avg_rating} rating, ${runner.completion_rate}% completion`);
      console.log(`   Created: ${runner.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error querying runners:', error);
  } finally {
    await pool.end();
  }
}

queryRunners();
