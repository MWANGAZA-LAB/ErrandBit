/**
 * Preimage Verification Tests
 * Tests for cryptographic payment verification
 */

import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import { verifyPreimage } from '../../services/PaymentService';

describe('Preimage Verification', () => {
  describe('verifyPreimage', () => {
    it('should verify valid preimage/hash pair', () => {
      // Generate a valid preimage
      const preimage = crypto.randomBytes(32).toString('hex');
      
      // Compute its hash
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest('hex');

      // Verify
      const isValid = verifyPreimage(hash, preimage);
      expect(isValid).toBe(true);
    });

    it('should reject invalid preimage', () => {
      const hash = crypto.randomBytes(32).toString('hex');
      const wrongPreimage = crypto.randomBytes(32).toString('hex');

      const isValid = verifyPreimage(hash, wrongPreimage);
      expect(isValid).toBe(false);
    });

    it('should reject preimage with wrong format', () => {
      const hash = crypto.randomBytes(32).toString('hex');
      const invalidPreimage = 'not-a-hex-string';

      const isValid = verifyPreimage(hash, invalidPreimage);
      expect(isValid).toBe(false);
    });

    it('should reject hash with wrong format', () => {
      const invalidHash = 'not-a-hex-string';
      const preimage = crypto.randomBytes(32).toString('hex');

      const isValid = verifyPreimage(invalidHash, preimage);
      expect(isValid).toBe(false);
    });

    it('should reject preimage with wrong length', () => {
      const hash = crypto.randomBytes(32).toString('hex');
      const shortPreimage = crypto.randomBytes(16).toString('hex'); // Only 16 bytes

      const isValid = verifyPreimage(hash, shortPreimage);
      expect(isValid).toBe(false);
    });

    it('should be case-insensitive for hex strings', () => {
      const preimage = crypto.randomBytes(32).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest('hex');

      // Verify with uppercase hash
      const isValid1 = verifyPreimage(hash.toUpperCase(), preimage);
      expect(isValid1).toBe(true);

      // Verify with uppercase preimage
      const isValid2 = verifyPreimage(hash, preimage.toUpperCase());
      expect(isValid2).toBe(true);

      // Both uppercase
      const isValid3 = verifyPreimage(hash.toUpperCase(), preimage.toUpperCase());
      expect(isValid3).toBe(true);
    });

    it('should handle multiple verification attempts consistently', () => {
      const preimage = crypto.randomBytes(32).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest('hex');

      // Verify multiple times
      for (let i = 0; i < 100; i++) {
        const isValid = verifyPreimage(hash, preimage);
        expect(isValid).toBe(true);
      }
    });

    it('should verify known test vectors', () => {
      // Test vector 1
      const preimage1 = '0000000000000000000000000000000000000000000000000000000000000000';
      const hash1 = '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925';
      expect(verifyPreimage(hash1, preimage1)).toBe(true);

      // Test vector 2
      const preimage2 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const hash2 = 'af9613760f72635fbdb44a5a0a63c39f12af30f950a6ee5c971be188e89c4051';
      expect(verifyPreimage(hash2, preimage2)).toBe(true);
    });

    it('should prevent timing attacks with constant-time comparison', () => {
      const preimage = crypto.randomBytes(32).toString('hex');
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest('hex');

      // Create a preimage that differs only in the last character
      const almostCorrectPreimage = preimage.slice(0, -1) + 
        (preimage[preimage.length - 1] === 'a' ? 'b' : 'a');

      // Measure time for correct preimage
      const start1 = process.hrtime.bigint();
      verifyPreimage(hash, preimage);
      const end1 = process.hrtime.bigint();
      const time1 = end1 - start1;

      // Measure time for almost correct preimage
      const start2 = process.hrtime.bigint();
      verifyPreimage(hash, almostCorrectPreimage);
      const end2 = process.hrtime.bigint();
      const time2 = end2 - start2;

      // Times should be similar (within 10x factor)
      // Note: This is a rough check, not a guarantee against all timing attacks
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('Payment Verification Integration', () => {
    it('should generate and verify payment proof', async () => {
      // Simulate the full flow:
      // 1. Generate preimage (done by Lightning node)
      const preimage = crypto.randomBytes(32).toString('hex');
      
      // 2. Compute payment hash (included in invoice)
      const paymentHash = crypto
        .createHash('sha256')
        .update(Buffer.from(preimage, 'hex'))
        .digest('hex');

      // 3. User pays and gets preimage
      // 4. Backend verifies preimage
      const isValid = verifyPreimage(paymentHash, preimage);

      expect(isValid).toBe(true);
    });

    it('should reject tampered payment proof', () => {
      // Original payment
      const originalPreimage = crypto.randomBytes(32).toString('hex');
      const paymentHash = crypto
        .createHash('sha256')
        .update(Buffer.from(originalPreimage, 'hex'))
        .digest('hex');

      // Attacker tries to use different preimage
      const attackerPreimage = crypto.randomBytes(32).toString('hex');

      const isValid = verifyPreimage(paymentHash, attackerPreimage);
      expect(isValid).toBe(false);
    });

    it('should handle edge case: empty strings', () => {
      const isValid = verifyPreimage('', '');
      expect(isValid).toBe(false);
    });

    it('should handle edge case: null/undefined', () => {
      // @ts-expect-error Testing invalid input
      const isValid1 = verifyPreimage(null, null);
      expect(isValid1).toBe(false);

      // @ts-expect-error Testing invalid input
      const isValid2 = verifyPreimage(undefined, undefined);
      expect(isValid2).toBe(false);
    });
  });
});
