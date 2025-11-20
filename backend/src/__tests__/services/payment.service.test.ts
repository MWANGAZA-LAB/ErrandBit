/**
 * PaymentService Unit Tests
 * Tests for payment preimage verification and cryptographic proof
 */

import { verifyPreimage, PaymentVerificationLevel } from '../../services/PaymentService.js';

describe('PaymentService - Preimage Verification', () => {
  describe('verifyPreimage', () => {
    it('should verify valid preimage against payment hash', () => {
      // Use actual SHA256 hash of the preimage (computed using crypto.createHash)
      const validPreimage = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      // Correct SHA256 hash of the above preimage (verified with Node.js crypto)
      const expectedHash = 'e0e77a507412b120f6ede61f62295b1a7b2ff19d3dcc8f7253e51663470c888e';

      const result = verifyPreimage(expectedHash, validPreimage);

      expect(result).toBe(true);
    });

    it('should reject invalid preimage', () => {
      const invalidPreimage = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
      const hash = 'e0e77a507412b120f6ede61f62295b1a7b2ff19d3dcc8f7253e51663470c888e'; // SHA256 of 'aaaa...'

      const result = verifyPreimage(hash, invalidPreimage);

      expect(result).toBe(false);
    });

    it('should handle uppercase and lowercase hex', () => {
      const preimage = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const hash = 'E0E77A507412B120F6EDE61F62295B1A7B2FF19D3DCC8F7253E51663470C888E'; // uppercase

      const result = verifyPreimage(hash, preimage);

      expect(result).toBe(true);
    });

    it('should reject malformed preimage', () => {
      const malformedPreimage = 'not-hex';
      const hash = '9ca8fa69f61db428e8ce5562e861e0e6eeee3c98007be2c069a1ac4be5ec9f09';

      // verifyPreimage returns false for malformed input, doesn't throw
      const result = verifyPreimage(hash, malformedPreimage);
      expect(result).toBe(false);
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
