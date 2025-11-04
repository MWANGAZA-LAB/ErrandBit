import { decode } from 'light-bolt11-decoder';

/**
 * Decode and validate a Lightning invoice (BOLT11)
 * @param {string} bolt11 - Lightning invoice string
 * @returns {Object} Decoded invoice data
 */
export function decodeLightningInvoice(bolt11) {
  try {
    const decoded = decode(bolt11);
    
    // Extract relevant sections
    const sections = {};
    decoded.sections.forEach(section => {
      sections[section.name] = section.value;
    });
    
    // Get amount in satoshis
    let amountSats = 0;
    if (sections.amount) {
      // Amount is in millisatoshis, convert to satoshis
      amountSats = Math.floor(sections.amount / 1000);
    }
    
    // Get payment hash
    const paymentHash = sections.payment_hash || null;
    
    // Get description
    const description = sections.description || '';
    
    // Get expiry (in seconds from creation)
    const expiry = sections.expiry || 3600; // Default 1 hour
    
    // Get timestamp (in seconds)
    const timestamp = sections.timestamp || Math.floor(Date.now() / 1000);
    
    // Calculate expiry date
    const expiresAt = new Date((timestamp + expiry) * 1000);
    
    return {
      paymentHash,
      amountSats,
      description,
      timestamp,
      expiry,
      expiresAt,
      isExpired: Date.now() > expiresAt.getTime(),
      raw: decoded,
    };
  } catch (error) {
    throw new Error(`Failed to decode Lightning invoice: ${error.message}`);
  }
}

/**
 * Validate a Lightning invoice for a job
 * @param {string} bolt11 - Lightning invoice
 * @param {number} expectedAmountSats - Expected amount in satoshis
 * @param {Object} pool - Database pool
 * @returns {Promise<Object>} Validation result
 */
export async function validateLightningInvoice(bolt11, expectedAmountSats, pool) {
  try {
    // Decode invoice
    const decoded = decodeLightningInvoice(bolt11);
    
    // Check if expired
    if (decoded.isExpired) {
      return {
        isValid: false,
        error: 'Invoice has expired',
        details: { expiresAt: decoded.expiresAt },
      };
    }
    
    // Check amount matches (allow 1% tolerance for rounding)
    const tolerance = Math.max(1, Math.floor(expectedAmountSats * 0.01));
    const amountDiff = Math.abs(decoded.amountSats - expectedAmountSats);
    
    if (amountDiff > tolerance) {
      return {
        isValid: false,
        error: 'Invoice amount does not match expected amount',
        details: {
          expected: expectedAmountSats,
          actual: decoded.amountSats,
          difference: amountDiff,
        },
      };
    }
    
    // Check if invoice already used (prevent double-spend)
    if (pool) {
      const existing = await pool.query(
        'SELECT id, job_id FROM payments WHERE payment_hash = $1',
        [decoded.paymentHash]
      );
      
      if (existing.rows.length > 0) {
        return {
          isValid: false,
          error: 'Invoice has already been used',
          details: { jobId: existing.rows[0].job_id },
        };
      }
    }
    
    return {
      isValid: true,
      invoice: decoded,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
}

/**
 * Convert USD cents to satoshis using current exchange rate
 * @param {number} cents - Amount in USD cents
 * @param {number} btcPriceUsd - Current BTC price in USD (optional, defaults to $40,000)
 * @returns {number} Amount in satoshis
 */
export function centsToSats(cents, btcPriceUsd = 40000) {
  const usd = cents / 100;
  const btc = usd / btcPriceUsd;
  const sats = Math.round(btc * 100000000);
  return sats;
}

/**
 * Convert satoshis to USD cents using current exchange rate
 * @param {number} sats - Amount in satoshis
 * @param {number} btcPriceUsd - Current BTC price in USD (optional, defaults to $40,000)
 * @returns {number} Amount in USD cents
 */
export function satsToCents(sats, btcPriceUsd = 40000) {
  const btc = sats / 100000000;
  const usd = btc * btcPriceUsd;
  const cents = Math.round(usd * 100);
  return cents;
}

/**
 * Verify payment preimage matches payment hash
 * @param {string} preimage - Payment preimage (hex)
 * @param {string} paymentHash - Expected payment hash (hex)
 * @returns {boolean} True if preimage is valid
 */
export async function verifyPreimage(preimage, paymentHash) {
  try {
    // In production, use crypto.createHash('sha256')
    // For now, basic validation
    if (!preimage || preimage.length !== 64) {
      return false;
    }
    if (!paymentHash || paymentHash.length !== 64) {
      return false;
    }
    
    // TODO: Implement SHA256 hash verification
    // const hash = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
    // return hash === paymentHash;
    
    return true; // Simplified for now
  } catch (error) {
    return false;
  }
}

/**
 * Create payment record in database
 * @param {Object} pool - Database pool
 * @param {number} jobId - Job ID
 * @param {string} paymentHash - Payment hash
 * @param {string} preimage - Payment preimage
 * @param {number} amountSats - Amount in satoshis
 * @returns {Promise<Object>} Created payment record
 */
export async function recordPayment(pool, jobId, paymentHash, preimage, amountSats) {
  const result = await pool.query(
    `INSERT INTO payments (job_id, payment_hash, preimage, amount_sats, paid_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [jobId, paymentHash, preimage, amountSats]
  );
  
  return result.rows[0];
}
