/**
 * Health Check Routes
 * System health and status endpoints
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db.js';

const router = Router();

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 */
router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * GET /health/detailed
 * Detailed health check including database connectivity
 */
router.get('/detailed', async (_req: Request, res: Response): Promise<void> => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  };

  // Check database connectivity
  try {
    const pool = getPool();
    if (pool) {
      await pool.query('SELECT 1');
      health.services.database = 'connected';
    } else {
      health.services.database = 'not configured';
    }
  } catch (error) {
    health.status = 'degraded';
    health.services.database = 'disconnected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ready
 * Readiness probe - checks if app is ready to serve traffic
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    if (!pool) {
      res.status(503).json({
        ready: false,
        reason: 'Database not configured',
      });
      return;
    }

    // Test database connection
    await pool.query('SELECT 1');

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - checks if app is alive (for Kubernetes)
 */
router.get('/live', (_req: Request, res: Response): void => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
