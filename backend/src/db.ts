/**
 * Database Connection - TypeScript
 * Strict type-safe PostgreSQL connection management
 */

import { Pool } from 'pg';
import type { DatabaseConfig } from './types/index.js';

let pool: Pool | null = null;

/**
 * Get or create database connection pool
 * @returns Database pool or null if not configured
 */
export function getPool(): Pool | null {
  if (pool) return pool;
  
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  
  pool = new Pool({ 
    connectionString: url, 
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  return pool;
}

/**
 * Check database connection health
 * @returns Database status
 */
export async function checkDb(): Promise<DatabaseConfig> {
  try {
    const p = getPool();
    if (!p) {
      return { 
        connected: false, 
        reason: 'DATABASE_URL not set',
        mode: 'mock',
      };
    }
    
    const res = await p.query('SELECT 1 as ok');
    const isOk = res.rows[0]?.ok === 1;
    
    return { 
      connected: true, 
      ok: isOk,
      mode: 'postgres',
    };
  } catch (e) {
    const error = e as Error;
    return { 
      connected: false, 
      error: error.message,
      mode: 'mock',
    };
  }
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
