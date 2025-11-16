/**
 * Payment Monitoring Service
 * Tracks payment health metrics and sends alerts
 */

import { getPool } from '../db.js';
import logger from '../utils/logger.js';
import { lightningService } from './lightning.service.js';

interface PaymentMetrics {
  total_payments_24h: number;
  successful_payments_24h: number;
  failed_payments_24h: number;
  success_rate_24h: number;
  average_payment_time_seconds: number;
  stuck_payments: number;
  total_revenue_sats_24h: number;
  pending_payouts: number;
}

interface StuckPayment {
  id: string;
  payment_hash: string;
  amount_sats: number;
  job_id: string;
  created_at: Date;
  hours_stuck: number;
}

export class PaymentMonitoringService {
  private stuckPaymentThresholdHours: number;
  private monitoringEnabled: boolean;
  private lastHealthCheck?: Date;
  private healthCheckInterval: number; // minutes

  constructor() {
    this.stuckPaymentThresholdHours = parseInt(
      process.env['STUCK_PAYMENT_THRESHOLD_HOURS'] || '2'
    );
    this.monitoringEnabled = process.env['ENABLE_PAYMENT_MONITORING'] === 'true';
    this.healthCheckInterval = parseInt(
      process.env['LIGHTNING_HEALTH_CHECK_INTERVAL_MINUTES'] || '5'
    );
  }

  /**
   * Get comprehensive payment metrics
   */
  async getPaymentMetrics(): Promise<PaymentMetrics> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not configured');
    }

    try {
      // Get 24h payment statistics
      const metricsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_payments,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_payments,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
          SUM(amount_sats) FILTER (WHERE status = 'completed') as total_revenue_sats,
          AVG(
            EXTRACT(EPOCH FROM (updated_at - created_at))
          ) FILTER (WHERE status = 'completed') as avg_payment_time_seconds
        FROM lightning_transactions
        WHERE created_at >= NOW() - INTERVAL '24 hours'
          AND transaction_type = 'job_payment'
      `);

      const metrics = metricsResult.rows[0];

      // Get stuck payments
      const stuckResult = await pool.query(`
        SELECT COUNT(*) as stuck_count
        FROM lightning_transactions
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '${this.stuckPaymentThresholdHours} hours'
      `);

      // Get pending payouts
      const payoutResult = await pool.query(`
        SELECT COUNT(*) as pending_count
        FROM lightning_transactions
        WHERE transaction_type = 'runner_payout'
          AND status = 'pending'
      `);

      const totalPayments = parseInt(metrics.total_payments) || 0;
      const successfulPayments = parseInt(metrics.successful_payments) || 0;
      const successRate = totalPayments > 0 
        ? (successfulPayments / totalPayments) * 100 
        : 0;

      return {
        total_payments_24h: totalPayments,
        successful_payments_24h: successfulPayments,
        failed_payments_24h: parseInt(metrics.failed_payments) || 0,
        success_rate_24h: parseFloat(successRate.toFixed(2)),
        average_payment_time_seconds: parseFloat(metrics.avg_payment_time_seconds) || 0,
        stuck_payments: parseInt(stuckResult.rows[0].stuck_count) || 0,
        total_revenue_sats_24h: parseInt(metrics.total_revenue_sats) || 0,
        pending_payouts: parseInt(payoutResult.rows[0].pending_count) || 0
      };
    } catch (error) {
      logger.error('Failed to fetch payment metrics:', error);
      throw error;
    }
  }

  /**
   * Get list of stuck payments
   */
  async getStuckPayments(): Promise<StuckPayment[]> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not configured');
    }

    try {
      const result = await pool.query(`
        SELECT 
          id,
          payment_hash,
          amount_sats,
          job_id,
          created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_stuck
        FROM lightning_transactions
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '${this.stuckPaymentThresholdHours} hours'
        ORDER BY created_at ASC
        LIMIT 100
      `);

      return result.rows.map(row => ({
        id: row.id,
        payment_hash: row.payment_hash,
        amount_sats: parseInt(row.amount_sats),
        job_id: row.job_id,
        created_at: row.created_at,
        hours_stuck: parseFloat(row.hours_stuck)
      }));
    } catch (error) {
      logger.error('Failed to fetch stuck payments:', error);
      throw error;
    }
  }

  /**
   * Check Lightning node health
   */
  async checkLightningHealth(): Promise<{
    connected: boolean;
    last_check: Date;
    error?: string;
  }> {
    try {
      const isConnected = await lightningService.validateConnection();
      this.lastHealthCheck = new Date();

      if (!isConnected) {
        logger.error('⚠️  Lightning node connection FAILED');
      } else {
        logger.info('✅ Lightning node connection healthy');
      }

      return {
        connected: isConnected,
        last_check: this.lastHealthCheck
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Lightning health check error:', error);
      
      return {
        connected: false,
        last_check: new Date(),
        error: err.message
      };
    }
  }

  /**
   * Send alert for stuck payments
   */
  private async alertStuckPayments(stuckPayments: StuckPayment[]): Promise<void> {
    if (stuckPayments.length === 0) return;

    logger.warn('🚨 STUCK PAYMENTS ALERT', {
      count: stuckPayments.length,
      payment_hashes: stuckPayments.map(p => p.payment_hash),
      total_amount_sats: stuckPayments.reduce((sum, p) => sum + p.amount_sats, 0)
    });

    // TODO: Send email alert
    // await emailService.sendAlert({
    //   subject: `Alert: ${stuckPayments.length} stuck payments`,
    //   body: `Found ${stuckPayments.length} payments stuck for over ${this.stuckPaymentThresholdHours} hours.`
    // });
  }

  /**
   * Send alert for Lightning connection failure
   */
  private async alertLightningDown(): Promise<void> {
    logger.error('🚨 LIGHTNING DOWN ALERT', {
      message: 'Lightning node connection failed',
      last_check: this.lastHealthCheck
    });

    // TODO: Send email alert
    // await emailService.sendAlert({
    //   subject: 'CRITICAL: Lightning node connection failed',
    //   body: 'The Lightning node connection health check failed. Immediate action required.'
    // });
  }

  /**
   * Send alert for abnormal success rate
   */
  private async alertLowSuccessRate(successRate: number): Promise<void> {
    logger.warn('🚨 LOW SUCCESS RATE ALERT', {
      success_rate: successRate,
      threshold: 90
    });

    // TODO: Send email alert
    // await emailService.sendAlert({
    //   subject: `Alert: Low payment success rate (${successRate.toFixed(1)}%)`,
    //   body: `Payment success rate has dropped to ${successRate.toFixed(1)}%. Normal rate is >90%.`
    // });
  }

  /**
   * Run monitoring checks and send alerts
   */
  async runMonitoringCycle(): Promise<void> {
    if (!this.monitoringEnabled) {
      logger.debug('Payment monitoring disabled');
      return;
    }

    logger.info('🔍 Running payment monitoring cycle...');

    try {
      // Check Lightning node health
      const health = await this.checkLightningHealth();
      if (!health.connected) {
        await this.alertLightningDown();
      }

      // Get payment metrics
      const metrics = await this.getPaymentMetrics();

      logger.info('Payment metrics:', metrics);

      // Check for stuck payments
      if (metrics.stuck_payments > 0) {
        const stuckPayments = await this.getStuckPayments();
        await this.alertStuckPayments(stuckPayments);
      }

      // Check success rate
      if (metrics.total_payments_24h >= 10 && metrics.success_rate_24h < 90) {
        await this.alertLowSuccessRate(metrics.success_rate_24h);
      }

      logger.info('✅ Monitoring cycle complete');
    } catch (error) {
      logger.error('Monitoring cycle error:', error);
    }
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(): void {
    if (!this.monitoringEnabled) {
      logger.info('Payment monitoring is disabled');
      return;
    }

    logger.info(`🚀 Starting payment monitoring (interval: ${this.healthCheckInterval}min)`);

    // Run immediately
    this.runMonitoringCycle().catch(err => {
      logger.error('Initial monitoring cycle failed:', err);
    });

    // Run periodically
    const intervalMs = this.healthCheckInterval * 60 * 1000;
    setInterval(() => {
      this.runMonitoringCycle().catch(err => {
        logger.error('Monitoring cycle failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Clean up expired invoices
   */
  async cleanupExpiredInvoices(): Promise<number> {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not configured');
    }

    try {
      const result = await pool.query(`
        UPDATE lightning_transactions
        SET status = 'expired'
        WHERE status = 'pending'
          AND created_at < NOW() - INTERVAL '${process.env['PAYMENT_INVOICE_EXPIRY_HOURS'] || 1} hours'
        RETURNING id
      `);

      const expiredCount = result.rowCount || 0;
      
      if (expiredCount > 0) {
        logger.info(`🧹 Cleaned up ${expiredCount} expired invoices`);
      }

      return expiredCount;
    } catch (error) {
      logger.error('Failed to cleanup expired invoices:', error);
      throw error;
    }
  }

  /**
   * Start expired invoice cleanup job
   */
  startCleanupJob(): void {
    logger.info('🚀 Starting expired invoice cleanup job (hourly)');

    // Run immediately
    this.cleanupExpiredInvoices().catch(err => {
      logger.error('Initial cleanup failed:', err);
    });

    // Run every hour
    setInterval(() => {
      this.cleanupExpiredInvoices().catch(err => {
        logger.error('Cleanup job failed:', err);
      });
    }, 60 * 60 * 1000); // 1 hour
  }
}

export const paymentMonitoringService = new PaymentMonitoringService();
