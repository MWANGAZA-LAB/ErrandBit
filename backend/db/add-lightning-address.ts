/**
 * Add Lightning Address for Test User1
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:newpassword@localhost:5432/errandbit'
});

async function addLightningAddress() {
  try {
    // Check if runner profile exists
    const checkResult = await pool.query(
      'SELECT * FROM runner_profiles WHERE user_id = 2'
    );

    if (checkResult.rows.length === 0) {
      // Create runner profile
      await pool.query(
        `INSERT INTO runner_profiles (user_id, display_name, lightning_address, bio) 
         VALUES (2, 'Test User1 Runner', 'testuser1@getalby.com', 'Test runner for development')`
      );
      console.log('✅ Runner profile created for Test User1');
    } else {
      // Update existing profile
      await pool.query(
        `UPDATE runner_profiles 
         SET lightning_address = 'testuser1@getalby.com'
         WHERE user_id = 2`
      );
      console.log('✅ Lightning address updated for Test User1');
    }

    // Display result
    const result = await pool.query(
      'SELECT user_id, display_name, lightning_address FROM runner_profiles WHERE user_id = 2'
    );

    console.log('\n⚡ Runner Profile:');
    console.log(`   User ID: ${result.rows[0].user_id}`);
    console.log(`   Name: ${result.rows[0].display_name}`);
    console.log(`   Lightning: ${result.rows[0].lightning_address}`);

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addLightningAddress();
