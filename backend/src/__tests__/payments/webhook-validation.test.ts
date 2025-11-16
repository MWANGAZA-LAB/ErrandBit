/**
 * Webhook Signature Validation Tests
 * Tests for webhook security
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import {
  validateWebhookSignature,
  generateWebhookSignature,
  verifyWebhookSignature
} from '../../middleware/webhook-validation';

describe('Webhook Signature Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const testSecret = 'test-webhook-secret-32-chars-long!';

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };
    mockNext = jest.fn() as NextFunction;
    
    // Set test environment
    process.env.LNBITS_WEBHOOK_SECRET = testSecret;
    process.env.NODE_ENV = 'test';
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature', () => {
      const payload = { payment_hash: 'test123', paid: true };
      const { signature, timestamp } = generateWebhookSignature(payload, testSecret);

      expect(signature).toMatch(/^[a-fA-F0-9]{64}$/);
      expect(timestamp).toBeGreaterThan(Date.now() - 1000);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = { payment_hash: 'test1' };
      const payload2 = { payment_hash: 'test2' };

      const sig1 = generateWebhookSignature(payload1, testSecret);
      const sig2 = generateWebhookSignature(payload2, testSecret);

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { payment_hash: 'test' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';

      const sig1 = generateWebhookSignature(payload, secret1);
      const sig2 = generateWebhookSignature(payload, secret2);

      expect(sig1.signature).not.toBe(sig2.signature);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = { payment_hash: 'test123' };
      const { signature, timestamp } = generateWebhookSignature(payload, testSecret);

      const isValid = verifyWebhookSignature(payload, signature, timestamp, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = { payment_hash: 'test123' };
      const timestamp = Date.now();
      const fakeSignature = crypto.randomBytes(32).toString('hex');

      const isValid = verifyWebhookSignature(payload, fakeSignature, timestamp, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject expired timestamp', () => {
      const payload = { payment_hash: 'test123' };
      const { signature } = generateWebhookSignature(payload, testSecret);
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago

      const isValid = verifyWebhookSignature(payload, signature, oldTimestamp, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject future timestamp', () => {
      const payload = { payment_hash: 'test123' };
      const { signature } = generateWebhookSignature(payload, testSecret);
      const futureTimestamp = Date.now() + (10 * 60 * 1000); // 10 minutes in future

      const isValid = verifyWebhookSignature(payload, signature, futureTimestamp, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = { payment_hash: 'test123' };
      const { signature, timestamp } = generateWebhookSignature(originalPayload, testSecret);

      // Attacker changes payload after signature is generated
      const tamperedPayload = { payment_hash: 'hacked' };

      const isValid = verifyWebhookSignature(tamperedPayload, signature, timestamp, testSecret);
      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const payload = { payment_hash: 'test' };
      const { signature, timestamp } = generateWebhookSignature(payload, testSecret);

      // Create signature that differs only in last character
      const almostCorrectSig = signature.slice(0, -1) + 
        (signature[signature.length - 1] === 'a' ? 'b' : 'a');

      // Measure verification times
      const start1 = process.hrtime.bigint();
      verifyWebhookSignature(payload, signature, timestamp, testSecret);
      const time1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      verifyWebhookSignature(payload, almostCorrectSig, timestamp, testSecret);
      const time2 = process.hrtime.bigint() - start2;

      // Times should be similar (constant-time comparison)
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('validateWebhookSignature middleware', () => {
    it('should allow request with valid signature', () => {
      const payload = { payment_hash: 'test123' };
      const { signature, timestamp } = generateWebhookSignature(payload, testSecret);

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp.toString()
        },
        body: payload,
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without signature header', () => {
      mockReq = {
        headers: {
          'x-webhook-timestamp': Date.now().toString()
        },
        body: { payment_hash: 'test' },
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject request without timestamp header', () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'fake-sig'
        },
        body: { payment_hash: 'test' },
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject request with invalid signature', () => {
      mockReq = {
        headers: {
          'x-webhook-signature': 'invalid-signature',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: { payment_hash: 'test' },
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject request with expired timestamp', () => {
      const payload = { payment_hash: 'test' };
      const oldTimestamp = Date.now() - (10 * 60 * 1000);
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(oldTimestamp + JSON.stringify(payload))
        .digest('hex');

      mockReq = {
        headers: {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': oldTimestamp.toString()
        },
        body: payload,
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should allow in development mode without secret', () => {
      delete process.env.LNBITS_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'development';

      mockReq = {
        headers: {
          'x-webhook-signature': 'any-signature',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: { payment_hash: 'test' },
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject in production without secret', () => {
      delete process.env.LNBITS_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'production';

      mockReq = {
        headers: {
          'x-webhook-signature': 'any-signature',
          'x-webhook-timestamp': Date.now().toString()
        },
        body: { payment_hash: 'test' },
        ip: '127.0.0.1'
      };

      validateWebhookSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should prevent replay attacks with old timestamp', () => {
      const payload = { payment_hash: 'test' };
      const { signature, timestamp } = generateWebhookSignature(payload, testSecret);

      // First request succeeds
      const isValid1 = verifyWebhookSignature(payload, signature, timestamp, testSecret);
      expect(isValid1).toBe(true);

      // Wait 6 minutes (past expiry window)
      const expiredTimestamp = timestamp - (6 * 60 * 1000);

      // Replay fails due to expired timestamp
      const isValid2 = verifyWebhookSignature(payload, signature, expiredTimestamp, testSecret);
      expect(isValid2).toBe(false);
    });
  });
});
