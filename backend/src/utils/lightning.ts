/**
 * Lightning Network Utilities - TypeScript
 * Strict type-safe Bitcoin Lightning payment validation
 */

import { decode } from 'light-bolt11-decoder';
import crypto from 'crypto';
import type { Pool } from 'pg';
import type { LightningInvoice, InvoiceValidation } from '../types/index.js';

// Type definitions for bolt11 decoder
interface DecodedSection {
  name: string;
  value?: string | number;
  letters?: string;
}

interface DecodedInvoice {
  sections: DecodedSection[];
}

/**
 * Decode a BOLT11 Lightning invoice
 * @param bolt11 - Lightning invoice string
 * @returns Decoded invoice data
 * @throws Error if invoice is invalid
 */
export function decodeLightningInvoice(bolt11: string): LightningInvoice {
  try {
    const decoded = decode(bolt11) as DecodedInvoice;
    
    // Extract payment hash
    const paymentHashSection = decoded.sections.find(
      (s: { name: string }) => s.name === 'payment_hash'
    );
    const paymentHash = paymentHashSection?.value as string | undefined;
    
    // Extract amount in millisatoshis
    const amountSection = decoded.sections.find(
      (s: { name: string }) => s.name === 'amount'
    );
    const amountMsat = amountSection?.value as string | undefined;
    const amountSats = amountMsat ? Math.floor(parseInt(amountMsat) / 1000) : null;
    
    // Extract description
    const descriptionSection = decoded.sections.find(
      (s: { name: string }) => s.name === 'description'
    );
    const description = descriptionSection?.value as string | null;
    
    // Extract timestamp
    const timestampSection = decoded.sections.find(
      (s: { name: string }) => s.name === 'timestamp'
    );
    const timestamp = timestampSection?.value 
      ? new Date(parseInt(timestampSection.value as string) * 1000)
      : new Date();
    
    // Extract expiry
    const expirySection = decoded.sections.find(
      (s: { name: string }) => s.name === 'expiry'
    );
    const expirySeconds = expirySection?.value 
      ? parseInt(expirySection.value as string)
      : 3600; // Default 1 hour
    
    const expiresAt = new Date(timestamp.getTime() + expirySeconds * 1000);
    
    if (!paymentHash) {
      throw new Error('Invoice missing payment hash');
    }
    
    return {
      paymentHash,
      amountSats,
      description,
      expiresAt,
      timestamp,
    };
  } catch (error) {
    throw new Error(`Failed to decode invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate a Lightning invoice for a payment
 * @param bolt11 - Lightning invoice string
 * @param expectedAmountSats - Expected amount in satoshis
 * @param pool - Database connection pool
 * @returns Validation result
 */
export async function validateLightningInvoice(
  bolt11: string,
  expectedAmountSats: number,
  pool: Pool
): Promise<InvoiceValidation> {
  try {
    // Decode the invoice
    const invoice = decodeLightningInvoice(bolt11);
    
    // Check if invoice has expired
    if (invoice.expiresAt < new Date()) {
      return {
        isValid: false,
        error: 'Invoice has expired',
        details: `Expired at ${invoice.expiresAt.toISOString()}`,
      };
    }
    
    // Check amount matches (allow 1% tolerance for rounding)
    if (invoice.amountSats !== null) {
      const tolerance = Math.max(1, Math.floor(expectedAmountSats * 0.01));
      const amountDiff = Math.abs(invoice.amountSats - expectedAmountSats);
      
      if (amountDiff > tolerance) {
        return {
          isValid: false,
          error: 'Invoice amount mismatch',
          details: `Expected ${expectedAmountSats} sats, got ${invoice.amountSats} sats`,
        };
      }
    }
    
    // Check if payment hash already used (prevent double-spend)
    const existingPayment = await pool.query(
      'SELECT id FROM payments WHERE payment_hash = $1',
      [invoice.paymentHash]
    );
    
    if (existingPayment.rows.length > 0) {
      return {
        isValid: false,
        error: 'Invoice already paid',
        details: 'This payment hash has already been used',
      };
    }
    
    return {
      isValid: true,
      invoice,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify a payment preimage matches a payment hash
 * @param preimage - Payment preimage (hex string)
 * @param paymentHash - Payment hash (hex string)
 * @returns True if preimage is valid
 */
export async function verifyPreimage(
  preimage: string,
  paymentHash: string
): Promise<boolean> {
  try {
    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(preimage) || !/^[0-9a-fA-F]+$/.test(paymentHash)) {
      return false;
    }
    
    // Calculate SHA256 hash of preimage
    const calculatedHash = crypto
      .createHash('sha256')
      .update(Buffer.from(preimage, 'hex'))
      .digest('hex');
    
    // Compare with payment hash
    return calculatedHash.toLowerCase() === paymentHash.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Convert cents to satoshis using current BTC price
 * @param cents - Amount in cents (USD)
 * @param btcPriceUsd - Bitcoin price in USD (default: $50,000)
 * @returns Amount in satoshis
 */
export function centsToSats(cents: number, btcPriceUsd: number = 50000): number {
  const usd = cents / 100;
  const btc = usd / btcPriceUsd;
  const sats = Math.round(btc * 100_000_000);
  return sats;
}

/**
 * Convert satoshis to cents using current BTC price
 * @param sats - Amount in satoshis
 * @param btcPriceUsd - Bitcoin price in USD (default: $50,000)
 * @returns Amount in cents (USD)
 */
export function satsToCents(sats: number, btcPriceUsd: number = 50000): number {
  const btc = sats / 100_000_000;
  const usd = btc * btcPriceUsd;
  const cents = Math.round(usd * 100);
  return cents;
}

/**
 * Record a payment in the database
 * @param pool - Database connection pool
 * @param jobId - Job ID
 * @param paymentHash - Payment hash
 * @param preimage - Payment preimage
 * @param amountSats - Amount in satoshis
 * @returns Payment ID
 */
export async function recordPayment(
  pool: Pool,
  jobId: number,
  paymentHash: string | null,
  preimage: string | null,
  amountSats: number
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO payments (job_id, payment_hash, preimage, amount_sats, paid_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [jobId, paymentHash, preimage, amountSats]
  );
  
  return result.rows[0]?.id as number;
}
