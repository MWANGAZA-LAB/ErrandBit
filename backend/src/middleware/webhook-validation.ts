/**
 * Webhook Signature Validation Middleware
 * Validates incoming webhook requests from LNBits using HMAC-SHA256
 * Prevents unauthorized webhook calls and replay attacks
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Validate webhook signature using HMAC-SHA256
 * Uses timing-safe comparison to prevent timing attacks
 */
export function validateWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    
    // Check if signature and timestamp are present
    if (!signature || !timestamp) {
      logger.warn('Webhook signature validation failed: Missing headers', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        ip: req.ip
      });
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature or timestamp'
      });
      return;
    }

    // Verify timestamp is recent (within 5 minutes)
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (Math.abs(now - timestampMs) > maxAge) {
      logger.warn('Webhook signature validation failed: Timestamp too old', {
        timestamp: timestampMs,
        now,
        age: Math.abs(now - timestampMs),
        ip: req.ip
      });
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook timestamp expired'
      });
      return;
    }

    // Get webhook secret from environment
    const secret = process.env['LNBITS_WEBHOOK_SECRET'];
    
    if (!secret) {
      logger.error('Webhook validation failed: LNBITS_WEBHOOK_SECRET not configured');
      
      // In development, allow webhooks without signature if no secret is set
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️  DEV MODE: Allowing webhook without signature validation');
        next();
        return;
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Webhook validation not configured'
      });
      return;
    }

    // Compute expected signature
    // Signature = HMAC-SHA256(secret, timestamp + body)
    const payload = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn('Webhook signature validation failed: Invalid signature', {
        expectedLength: expectedSignature.length,
        receivedLength: signature.length,
        ip: req.ip
      });
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
      return;
    }

    // Signature is valid, proceed
    logger.info('✅ Webhook signature validated successfully', {
      timestamp: timestampMs,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    logger.error('Webhook signature validation error:', error);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Webhook validation failed'
    });
  }
}

/**
 * Generate webhook signature for outgoing webhooks
 * Used when ErrandBit sends webhooks to external services
 */
export function generateWebhookSignature(
  payload: any,
  secret: string
): { signature: string; timestamp: number } {
  const timestamp = Date.now();
  const payloadString = timestamp + JSON.stringify(payload);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
  
  return { signature, timestamp };
}

/**
 * Verify webhook signature (standalone function for testing)
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  timestamp: number,
  secret: string
): boolean {
  try {
    // Check timestamp age
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (Math.abs(now - timestamp) > maxAge) {
      return false;
    }

    // Compute expected signature
    const payloadString = timestamp + JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification error:', error);
    return false;
  }
}
