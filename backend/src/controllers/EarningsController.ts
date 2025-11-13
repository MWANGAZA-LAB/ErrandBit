/**
 * Runner Earnings Controller
 * Handles runner earnings, payouts, and balance management
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { payoutService } from '../services/PayoutService';
import logger from '../utils/logger';

export class EarningsController {
  /**
   * GET /api/earnings/summary
   * Get runner's earnings summary
   */
  getEarningsSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const runnerId = req.userId;

      if (!runnerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const summary = await payoutService.getRunnerEarnings(Number(runnerId));

      res.status(200).json({
        success: true,
        data: {
          totalPayouts: parseInt(summary.total_payouts || '0'),
          totalEarnedCents: parseInt(summary.total_earned_cents || '0'),
          totalEarnedSats: parseInt(summary.total_earned_sats || '0'),
          pendingCents: parseInt(summary.pending_cents || '0')
        }
      });
    } catch (error: any) {
      logger.error('Error fetching earnings summary', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch earnings summary',
        message: error.message
      });
    }
  };

  /**
   * GET /api/earnings/history
   * Get runner's payout history
   */
  getPayoutHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const runnerId = req.userId;
      const limit = parseInt(req.query['limit'] as string) || 50;

      if (!runnerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const history = await payoutService.getRunnerPayoutHistory(Number(runnerId), limit);

      res.status(200).json({
        success: true,
        data: history.map((item) => ({
          id: item.id,
          jobId: item.job_id,
          jobTitle: item.job_title,
          amountCents: item.amount_cents,
          amountSats: item.amount_sats,
          platformFeeCents: item.platform_fee_cents,
          netAmountCents: item.net_amount_cents,
          netAmountSats: item.net_amount_sats,
          status: item.status,
          payoutMethod: item.payout_method,
          lightningAddress: item.lightning_address,
          paymentHash: item.payment_hash,
          createdAt: item.created_at,
          completedAt: item.completed_at,
          errorMessage: item.error_message
        }))
      });
    } catch (error: any) {
      logger.error('Error fetching payout history', { error: error.message });
      res.status(500).json({
        error: 'Failed to fetch payout history',
        message: error.message
      });
    }
  };

  /**
   * POST /api/earnings/:id/retry
   * Retry failed payout
   */
  retryPayout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const earningId = parseInt(req.params['id'] || '0');
      const runnerId = req.userId;

      if (!runnerId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // TODO: Verify the earning belongs to this runner

      const success = await payoutService.processPayout(earningId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Payout processed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payout processing failed'
        });
      }
    } catch (error: any) {
      logger.error('Error retrying payout', { error: error.message });
      res.status(500).json({
        error: 'Failed to retry payout',
        message: error.message
      });
    }
  };
}

export const earningsController = new EarningsController();
