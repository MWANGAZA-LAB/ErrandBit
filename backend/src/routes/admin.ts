/**
 * Admin Routes
 * Administrative endpoints for system management
 */

import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * POST /api/admin/apply-migrations
 * Apply pending database migrations
 */
router.post('/apply-migrations', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(500).json({
        error: 'Database not configured'
      });
      return;
    }

    const results = [];

    // Apply migration 004: Add payment_method column
    try {
      console.log('Applying migration 004: Add payment_method column...');
      const migration004 = readFileSync(
        join(__dirname, '..', '..', 'db', 'migrations', '004_add_payment_method.sql'),
        'utf-8'
      );
      await pool.query(migration004);
      
      // Verify columns exist
      const verifyResult004 = await pool.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'lightning_transactions' 
          AND column_name IN ('payment_method', 'verification_level', 'payment_proof_image')
        ORDER BY column_name
      `);
      
      results.push({
        migration: '004_add_payment_method',
        status: 'success',
        columns: verifyResult004.rows
      });
    } catch (error) {
      console.error('Migration 004 error:', error);
      results.push({
        migration: '004_add_payment_method',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Apply migration 005: Enhance job status
    try {
      console.log('Applying migration 005: Enhance job status flow...');
      const migration005 = readFileSync(
        join(__dirname, '..', '..', 'db', 'migrations', '005_enhance_job_status.sql'),
        'utf-8'
      );
      await pool.query(migration005);
      
      // Verify constraint updated
      const verifyResult005 = await pool.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname = 'jobs_status_check' AND conrelid = 'jobs'::regclass
      `);
      
      results.push({
        migration: '005_enhance_job_status',
        status: 'success',
        constraint: verifyResult005.rows[0]
      });
    } catch (error) {
      console.error('Migration 005 error:', error);
      results.push({
        migration: '005_enhance_job_status',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Migrations applied',
      results
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Failed to apply migrations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
