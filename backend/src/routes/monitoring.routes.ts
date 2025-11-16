/**
 * Monitoring Routes
 * Admin endpoints for payment monitoring and system health
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { paymentMonitoringService } from '../services/payment-monitoring.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/monitoring/payments
 * Get payment metrics and health status
 * Requires authentication (admin only in production)
 */
router.get('/payments', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const metrics = await paymentMonitoringService.getPaymentMetrics();
    const stuckPayments = await paymentMonitoringService.getStuckPayments();

    res.json({
      success: true,
      metrics,
      stuck_payments: stuckPayments,
      timestamp: new Date()
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Get payment metrics error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment metrics',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/monitoring/lightning/health
 * Check Lightning node connection health
 */
router.get('/lightning/health', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const health = await paymentMonitoringService.checkLightningHealth();

    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Lightning health check error:', err);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/monitoring/cleanup/expired-invoices
 * Manually trigger cleanup of expired invoices
 * Admin only
 */
router.post('/cleanup/expired-invoices', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check
    // if (req.userRole !== 'admin') {
    //   res.status(403).json({ error: 'Admin access required' });
    //   return;
    // }

    const expiredCount = await paymentMonitoringService.cleanupExpiredInvoices();

    res.json({
      success: true,
      expired_invoices_cleaned: expiredCount,
      timestamp: new Date()
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Manual cleanup error:', err);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/monitoring/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [metrics, lightningHealth, stuckPayments] = await Promise.all([
      paymentMonitoringService.getPaymentMetrics(),
      paymentMonitoringService.checkLightningHealth(),
      paymentMonitoringService.getStuckPayments()
    ]);

    res.json({
      success: true,
      dashboard: {
        payment_metrics: metrics,
        lightning_health: lightningHealth,
        stuck_payments: {
          count: stuckPayments.length,
          total_amount_sats: stuckPayments.reduce((sum, p) => sum + p.amount_sats, 0),
          payments: stuckPayments.slice(0, 10) // Top 10 stuck payments
        },
        alerts: {
          has_stuck_payments: stuckPayments.length > 0,
          low_success_rate: metrics.success_rate_24h < 90 && metrics.total_payments_24h >= 10,
          lightning_down: !lightningHealth.connected
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Dashboard data error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/monitoring/test-alert
 * Test alert system (development only)
 */
router.post('/test-alert', authenticate, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      error: 'Test alerts disabled in production'
    });
    return;
  }

  try {
    logger.warn('🧪 TEST ALERT: This is a test alert from the monitoring system');

    res.json({
      success: true,
      message: 'Test alert sent (check logs)'
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Test alert error:', err);
    res.status(500).json({
      success: false,
      error: 'Test alert failed',
      message: err.message
    });
  }
});

export default router;
