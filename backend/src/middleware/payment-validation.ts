/**
 * Payment Validation Middleware
 * Validates payment proof submissions and prevents abuse
 */

import type { Request, Response, NextFunction } from 'express';
import type { PaymentMethod } from '../services/PaymentService.js';

export interface PaymentValidationRequest extends Request {
  body: {
    jobId: number;
    paymentHash: string;
    proof: string;
    method: PaymentMethod;
  };
}

/**
 * Validate payment proof format and size
 */
export function validatePaymentProof(
  req: PaymentValidationRequest,
  res: Response,
  next: NextFunction
): void {
  const { method, proof, paymentHash } = req.body;

  // Validate required fields
  if (!method || !proof || !paymentHash) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'method, proof, and paymentHash are required'
    });
    return;
  }

  // Validate payment method
  const validMethods: PaymentMethod[] = ['webln', 'qr', 'manual', 'upload'];
  if (!validMethods.includes(method)) {
    res.status(400).json({
      error: 'Invalid payment method',
      message: `Method must be one of: ${validMethods.join(', ')}`
    });
    return;
  }

  // Validate payment hash format (64 hex characters)
  if (!/^[a-fA-F0-9]{64}$/.test(paymentHash)) {
    res.status(400).json({
      error: 'Invalid payment hash format',
      message: 'Payment hash must be 64 hexadecimal characters'
    });
    return;
  }

  // Validate proof based on method
  if (method === 'webln' || method === 'manual') {
    // Preimage should be 64 hex characters
    if (!/^[a-fA-F0-9]{64}$/.test(proof)) {
      res.status(400).json({
        error: 'Invalid preimage format',
        message: 'Preimage must be 64 hexadecimal characters'
      });
      return;
    }
  }

  if (method === 'upload') {
    // Validate image data URL format
    if (!proof.startsWith('data:image/')) {
      res.status(400).json({
        error: 'Invalid image format',
        message: 'Proof must be a valid image data URL (data:image/...)'
      });
      return;
    }

    // Check image size (max 5MB)
    const base64Length = proof.split(',')[1]?.length || 0;
    const sizeInBytes = (base64Length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (sizeInBytes > maxSize) {
      res.status(400).json({
        error: 'Image too large',
        message: `Image must be less than ${maxSize / (1024 * 1024)}MB`
      });
      return;
    }

    // Validate image type (only common formats)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const mimeType = proof.split(';')[0]?.split(':')[1];
    
    if (!mimeType || !allowedTypes.includes(mimeType)) {
      res.status(400).json({
        error: 'Unsupported image type',
        message: `Image must be one of: ${allowedTypes.join(', ')}`
      });
      return;
    }
  }

  // All validations passed
  next();
}

/**
 * Validate payment verification update
 * Used when runner/admin updates verification status
 */
export function validateVerificationUpdate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { paymentHash, verificationLevel } = req.body;

  if (!paymentHash || !verificationLevel) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'paymentHash and verificationLevel are required'
    });
    return;
  }

  // Validate payment hash format
  if (!/^[a-fA-F0-9]{64}$/.test(paymentHash)) {
    res.status(400).json({
      error: 'Invalid payment hash format',
      message: 'Payment hash must be 64 hexadecimal characters'
    });
    return;
  }

  // Validate verification level
  const validLevels = ['cryptographic', 'pending_manual', 'verified_manual', 'disputed'];
  if (!validLevels.includes(verificationLevel)) {
    res.status(400).json({
      error: 'Invalid verification level',
      message: `Verification level must be one of: ${validLevels.join(', ')}`
    });
    return;
  }

  next();
}

/**
 * Validate invoice creation request
 */
export function validateInvoiceCreation(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { jobId, amountSats } = req.body;

  if (!jobId || !amountSats) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'jobId and amountSats are required'
    });
    return;
  }

  // Validate amount is positive integer
  if (!Number.isInteger(amountSats) || amountSats <= 0) {
    res.status(400).json({
      error: 'Invalid amount',
      message: 'Amount must be a positive integer in satoshis'
    });
    return;
  }

  // Validate reasonable amount (max 0.1 BTC = 10,000,000 sats)
  const maxSats = 10_000_000;
  if (amountSats > maxSats) {
    res.status(400).json({
      error: 'Amount too large',
      message: `Amount must be less than ${maxSats} satoshis`
    });
    return;
  }

  next();
}

/**
 * Rate limiting specifically for payment endpoints
 * Prevents spam and abuse
 */
const paymentAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitPayments(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identifier = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 10; // 10 attempts per minute

  const record = paymentAttempts.get(identifier);

  if (!record || now > record.resetAt) {
    // Create new window
    paymentAttempts.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    next();
    return;
  }

  if (record.count >= maxAttempts) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before submitting another payment',
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    });
    return;
  }

  // Increment counter
  record.count++;
  next();
}

/**
 * Clean up old rate limit records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of paymentAttempts.entries()) {
    if (now > record.resetAt) {
      paymentAttempts.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
