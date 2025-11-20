/**
 * PaymentService Unit Tests
 * Tests for payment preimage verification and cryptographic proof
 */

import { verifyPreimage, PaymentVerificationLevel } from '../../services/PaymentService.js';

describe('PaymentService - Preimage Verification', () => {
  describe('verifyPreimage', () => {
    it('should verify valid preimage against payment hash', () => {
      // Use actual SHA256 hash of the preimage
      const validPreimage = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const expectedHash = 'bcb28d09cc2b7f47b8c87f88e311b8ea2ab91cd9f6579ab0cd9e552596e57a7c'; // SHA256 of preimage

      const result = verifyPreimage(expectedHash, validPreimage);

      expect(result).toBe(true);
    });

    it('should reject invalid preimage', () => {
      const invalidPreimage = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const hash = 'bcb28d09cc2b7f47b8c87f88e311b8ea2ab91cd9f6579ab0cd9e552596e57a7c'; // SHA256 of 'aaaa...'

      const result = verifyPreimage(hash, invalidPreimage);

      expect(result).toBe(false);
    });

    it('should handle uppercase and lowercase hex', () => {
      const preimage = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const hash = 'BCB28D09CC2B7F47B8C87F88E311B8EA2AB91CD9F6579AB0CD9E552596E57A7C'; // uppercase

      const result = verifyPreimage(hash, preimage);

      expect(result).toBe(true);
    });

    it('should reject malformed preimage', () => {
      const malformedPreimage = 'not-hex';
      const hash = '4f8b42c22dd3729b519ba6f68d2da7cc5b2d606d05daed5ad5128cc03e6c6358';

      expect(() => verifyPreimage(hash, malformedPreimage)).toThrow();
    });
  });

  describe('PaymentVerificationLevel', () => {
    it('should have correct verification levels', () => {
      expect(PaymentVerificationLevel.CRYPTOGRAPHIC).toBe('cryptographic');
      expect(PaymentVerificationLevel.PENDING_MANUAL).toBe('pending_manual');
      expect(PaymentVerificationLevel.VERIFIED_MANUAL).toBe('verified_manual');
      expect(PaymentVerificationLevel.DISPUTED).toBe('disputed');
    });
  });
});
