/**
 * Invoice Generation Tests
 * Tests for creating Lightning invoices
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import crypto from 'crypto';
import { lightningService } from '../../services/lightning.service';
import { getPool } from '../../db';

describe('Invoice Generation', () => {
  // Skip these tests if LNBits is not configured (CI environment)
  const skipIfNoLNBits = !process.env.LNBITS_API_KEY || !process.env.LNBITS_BASE_URL;
  
  beforeAll(async () => {
    // Setup test database connection
    process.env.NODE_ENV = 'test';
    
    if (skipIfNoLNBits) {
      console.log('⚠️  Skipping invoice generation tests - LNBits not configured');
    }
  });

  afterAll(async () => {
    // Close database connections
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });

  describe('createInvoice', () => {
    (skipIfNoLNBits ? it.skip : it)('should create invoice with valid parameters', async () => {
      const input = {
        amount_sats: 10000,
        amount_usd: 5.00,
        job_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        description: 'Test job payment'
      };

      const invoice = await lightningService.createInvoice(input);

      expect(invoice).toBeDefined();
      expect(invoice.payment_hash).toMatch(/^[a-fA-F0-9]{64}$/);
      expect(invoice.payment_request).toContain('lnbc');
      expect(invoice.amount_sats).toBe(10000);
      expect(invoice.expires_at).toBeInstanceOf(Date);
    });

    it('should reject invoice with zero amount', async () => {
      const input = {
        amount_sats: 0,
        amount_usd: 0,
        job_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        description: 'Invalid amount'
      };

      await expect(
        lightningService.createInvoice(input)
      ).rejects.toThrow();
    });

    it('should reject invoice with negative amount', async () => {
      const input = {
        amount_sats: -1000,
        amount_usd: -0.50,
        job_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        description: 'Negative amount'
      };

      await expect(
        lightningService.createInvoice(input)
      ).rejects.toThrow();
    });

    (skipIfNoLNBits ? it.skip : it)('should generate unique payment hashes', async () => {
      const input1 = {
        amount_sats: 5000,
        amount_usd: 2.50,
        job_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        description: 'Test 1'
      };

      const input2 = {
        ...input1,
        description: 'Test 2'
      };

      const invoice1 = await lightningService.createInvoice(input1);
      const invoice2 = await lightningService.createInvoice(input2);

      expect(invoice1.payment_hash).not.toBe(invoice2.payment_hash);
      expect(invoice1.payment_request).not.toBe(invoice2.payment_request);
    });

    (skipIfNoLNBits ? it.skip : it)('should store invoice in database', async () => {
      const pool = getPool();
      if (!pool) {
        throw new Error('Database not configured');
      }

      const input = {
        amount_sats: 8000,
        amount_usd: 4.00,
        job_id: crypto.randomUUID(),
        user_id: crypto.randomUUID(),
        description: 'Database test'
      };

      const invoice = await lightningService.createInvoice(input);

      // Query database for the transaction
      const result = await pool.query(
        'SELECT * FROM lightning_transactions WHERE payment_hash = $1',
        [invoice.payment_hash]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].payment_hash).toBe(invoice.payment_hash);
      expect(result.rows[0].status).toBe('pending');
      expect(parseInt(result.rows[0].amount_sats)).toBe(8000);
    });

    (skipIfNoLNBits ? it.skip : it)('should handle concurrent invoice generation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        return lightningService.createInvoice({
          amount_sats: 1000 * (i + 1),
          amount_usd: 0.50 * (i + 1),
          job_id: crypto.randomUUID(),
          user_id: crypto.randomUUID(),
          description: `Concurrent test ${i}`
        });
      });

      const invoices = await Promise.all(promises);

      // All should succeed
      expect(invoices).toHaveLength(10);

      // All payment hashes should be unique
      const hashes = invoices.map(inv => inv.payment_hash);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10);
    });
  });

  describe('BTC/USD Conversion', () => {
    it('should convert USD to sats', async () => {
      const sats = await lightningService.usdToSats(10.00);
      
      expect(sats).toBeGreaterThan(0);
      expect(Number.isInteger(sats)).toBe(true);
    });

    it('should convert sats to USD', async () => {
      const usd = await lightningService.satsToUsd(100000);
      
      expect(usd).toBeGreaterThan(0);
      expect(typeof usd).toBe('number');
    });

    it('should maintain conversion consistency', async () => {
      const originalUsd = 25.00;
      const sats = await lightningService.usdToSats(originalUsd);
      const convertedUsd = await lightningService.satsToUsd(sats);

      // Allow 1% variance due to rounding
      const variance = Math.abs(convertedUsd - originalUsd);
      expect(variance).toBeLessThan(originalUsd * 0.01);
    });
  });

  describe('LNBits Connection', () => {
    it('should validate connection when credentials are configured', async () => {
      if (process.env.LNBITS_API_KEY) {
        const isConnected = await lightningService.validateConnection();
        expect(isConnected).toBe(true);
      } else {
        // Skip if not configured
        expect(true).toBe(true);
      }
    });
  });
});
