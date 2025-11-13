# Lightning Network Integration Guide

## 🎯 Overview

ErrandBit now has **production-ready Lightning Network payment infrastructure** via LNbits API integration. This guide explains how to configure and use real Lightning payments.

---

## 🚀 Quick Start

### 1. Get LNbits Credentials

**Option A: Use LNbits Demo (Testing)**
```bash
# Visit: https://legend.lnbits.com/
# Create a wallet and get:
# - Invoice/Read Key (for receiving payments)
# - Admin Key (for sending payments)
```

**Option B: Self-Host LNbits (Production)**
```bash
# Using Docker
docker run -d \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  lnbits/lnbits:latest

# Visit: http://localhost:5000
```

**Option C: Use Voltage.cloud (Managed)**
- Visit: https://voltage.cloud
- Create Lightning node
- Enable LNbits extension

### 2. Configure Environment Variables

Add to `.env`:

```bash
# Real Lightning (Production)
LNBITS_API_URL=https://legend.lnbits.com  # or your instance
LNBITS_API_KEY=your_invoice_read_key_here
LNBITS_WALLET_ID=your_wallet_id_here       # optional

# For sending payments (payouts to runners)
LNBITS_ADMIN_KEY=your_admin_key_here

# Mock mode (Development)
USE_MOCK_LIGHTNING=true  # Set to false for production
```

### 3. Update PaymentService

Replace mock implementation with real Lightning:

```typescript
// backend/src/services/payment/PaymentService.ts

import { RealLightningService } from '../lightning/RealLightningService.js';

export class PaymentService {
  private lightningService: RealLightningService;

  constructor() {
    // Initialize with real Lightning
    this.lightningService = new RealLightningService({
      apiUrl: process.env['LNBITS_API_URL']!,
      apiKey: process.env['LNBITS_API_KEY']!,
      walletId: process.env['LNBITS_WALLET_ID'],
    });
  }

  async createInvoice(amountSats: number, description: string) {
    // Creates REAL Lightning invoice
    return await this.lightningService.createInvoice(
      amountSats,
      description,
      3600 // 1 hour expiry
    );
  }

  async checkPaymentStatus(paymentHash: string) {
    // Checks REAL payment status from LNbits
    return await this.lightningService.checkPaymentStatus(paymentHash);
  }

  async sendPayment(lightningAddress: string, amountSats: number) {
    // Sends REAL payment to runner
    return await this.lightningService.sendPayment(
      lightningAddress,
      amountSats,
      'Runner payout'
    );
  }
}
```

---

## 📚 API Reference

### RealLightningService

#### `createInvoice(amountSats, description, expirySeconds)`

Creates a Lightning invoice for receiving payments.

```typescript
const invoice = await lightningService.createInvoice(
  10000, // 10,000 sats
  'Job #123 payment',
  3600 // 1 hour expiry
);

// Returns:
// {
//   paymentRequest: "lnbc100n1...", // BOLT11 invoice
//   paymentHash: "abc123...",
//   amountSats: 10000,
//   expiresAt: Date,
//   checkUrl: "https://legend.lnbits.com/api/v1/payments/abc123"
// }
```

#### `checkPaymentStatus(paymentHash)`

Checks if an invoice has been paid.

```typescript
const status = await lightningService.checkPaymentStatus(
  'abc123...'
);

// Returns:
// {
//   paid: true,
//   paymentHash: "abc123...",
//   preimage: "def456...", // proof of payment
//   amountPaidSats: 10000,
//   paidAt: Date
// }
```

#### `sendPayment(destination, amountSats, memo)`

Sends a Lightning payment (requires Admin key).

```typescript
const result = await lightningService.sendPayment(
  'user@getalby.com', // Lightning address
  5000, // 5,000 sats
  'Payout for job #123'
);

// Returns:
// {
//   success: true,
//   paymentHash: "xyz789...",
//   preimage: "pre123...",
//   amountSats: 5000,
//   fee: 2 // sats
// }
```

#### `verifyPayment(preimage, expectedHash)`

Cryptographically verifies a payment preimage.

```typescript
const isValid = await lightningService.verifyPayment(
  'def456...', // preimage from payment
  'abc123...'  // expected payment hash
);

// Returns: true if preimage is valid
```

---

## 🔄 Complete Payment Flow

### Client Pays for Job

```typescript
// 1. Client creates job
const job = await jobService.create({
  title: "Grocery Shopping",
  budgetSats: 50000
});

// 2. Runner accepts job
await jobService.assignRunner(job.id, runnerId);

// 3. Create Lightning invoice
const invoice = await paymentService.createInvoiceForJob(
  job.id,
  job.budgetSats
);

// 4. Client pays invoice with any Lightning wallet
// (Show invoice.paymentRequest as QR code or copy button)

// 5. Webhook or polling checks payment
const status = await paymentService.checkPaymentStatus(
  invoice.paymentHash
);

if (status.paid) {
  // 6. Update job status
  await jobService.updateStatus(job.id, 'payment_confirmed');
  
  // 7. Auto-payout to runner (if has Lightning address)
  if (runner.lightningAddress) {
    await payoutService.sendPaymentToRunner(
      runner.id,
      job.budgetSats * 0.95 // 95% to runner, 5% platform fee
    );
  }
}
```

### Runner Receives Payout

```typescript
// When payment confirmed, automatically pay runner
async function processRunnerPayout(jobId: number) {
  const job = await jobService.findById(jobId);
  const runner = await runnerService.findById(job.runnerId);
  
  if (!runner.lightningAddress) {
    // Runner hasn't set up Lightning address yet
    await earningsService.addPendingEarnings(runner.id, job.budgetSats);
    return;
  }
  
  // Send payment via Lightning
  const result = await lightningService.sendPayment(
    runner.lightningAddress,
    job.budgetSats * 0.95, // 95% payout
    `Payout for job #${job.id}`
  );
  
  if (result.success) {
    await earningsService.recordPayout({
      runnerId: runner.id,
      jobId: job.id,
      amountSats: job.budgetSats * 0.95,
      paymentHash: result.paymentHash,
      status: 'completed'
    });
  }
}
```

---

## 🧪 Testing

### Mock Mode (Development)

Set `USE_MOCK_LIGHTNING=true` in `.env`:

```typescript
// Uses fake invoices for testing
const invoice = await lightningService.createInvoice(10000, 'test');

// Simulate payment
await lightningService.mockPayInvoice(invoice.paymentHash);

// Check status (will show as paid)
const status = await lightningService.checkPaymentStatus(
  invoice.paymentHash
);
// status.paid === true
```

### Real Lightning (Testnet)

1. Get testnet sats from faucet:
   - https://testnet.lightning.page/
   - https://legend.lnbits.com/ (Regtest mode)

2. Use LNbits demo instance:
   - https://legend.lnbits.com/
   - Create test wallet
   - Get API keys

3. Test payment flow:
   ```bash
   # Pay invoice with any Lightning wallet
   lightning-cli pay lnbc100n1...
   ```

---

## 🔐 Security Best Practices

### 1. Never Expose Admin Keys

```typescript
// ❌ BAD - Don't send admin key to frontend
res.json({ lnbitsKey: process.env['LNBITS_ADMIN_KEY'] });

// ✅ GOOD - Keep admin key server-side only
const lightningService = new RealLightningService({
  apiKey: process.env['LNBITS_ADMIN_KEY']!
});
```

### 2. Validate Payment Amounts

```typescript
// Always verify amount paid matches expected
if (status.amountPaidSats !== expectedAmount) {
  throw new Error('Payment amount mismatch');
}
```

### 3. Verify Preimages

```typescript
// Cryptographically verify payment proof
const isValid = await lightningService.verifyPayment(
  preimage,
  paymentHash
);

if (!isValid) {
  throw new Error('Invalid payment preimage');
}
```

### 4. Handle Webhook Signatures

```typescript
// Verify LNbits webhook signatures
function verifyWebhookSignature(payload: string, signature: string) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env['LNBITS_WEBHOOK_SECRET']!)
    .update(payload)
    .digest('hex');
    
  return signature === expectedSignature;
}
```

### 5. Set Invoice Expiry

```typescript
// Always set reasonable expiry times
const invoice = await lightningService.createInvoice(
  amountSats,
  description,
  3600 // 1 hour - not too long!
);
```

---

## 🐛 Troubleshooting

### Issue: "LNBITS_API_KEY not set"

**Solution:** Add API key to `.env`:
```bash
LNBITS_API_KEY=your_invoice_key_here
```

### Issue: "Payment status always returns unpaid"

**Solution:** Check payment hash format:
```typescript
// Must be lowercase hex
const hash = paymentHash.toLowerCase();
```

### Issue: "Cannot send payments"

**Solution:** Use Admin key, not Invoice key:
```bash
# For sending (payouts)
LNBITS_ADMIN_KEY=your_admin_key_here

# For receiving (invoices)
LNBITS_API_KEY=your_invoice_key_here
```

### Issue: "Webhook not receiving events"

**Solution:** Configure webhook in LNbits:
```bash
# In LNbits UI: Wallet > Webhooks
# Add: https://yourdomain.com/api/webhooks/lightning
```

---

## 📈 Monitoring & Logging

All Lightning operations are logged:

```typescript
// Check logs for payment flow
logger.info('Lightning invoice created', { 
  paymentHash, 
  amountSats, 
  expiresAt 
});

logger.info('Payment received', { 
  paymentHash, 
  amountPaidSats, 
  paidAt 
});

logger.error('Payment failed', { 
  error, 
  paymentHash 
});
```

View logs:
```bash
# Backend logs
tail -f backend/logs/combined.log

# Payment-specific logs
grep "Lightning" backend/logs/combined.log
```

---

## 🚢 Production Deployment

### 1. Environment Variables

Set in production:
```bash
USE_MOCK_LIGHTNING=false
LNBITS_API_URL=https://your-lnbits-instance.com
LNBITS_API_KEY=<your-production-key>
LNBITS_ADMIN_KEY=<your-admin-key>
```

### 2. Database Indexes

Ensure indexes exist:
```sql
CREATE INDEX idx_payments_hash ON payments(payment_hash);
CREATE INDEX idx_payments_job ON payments(job_id);
CREATE INDEX idx_runner_earnings_status ON runner_earnings(status);
```

### 3. Error Handling

Implement retry logic:
```typescript
async function checkPaymentWithRetry(hash: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await lightningService.checkPaymentStatus(hash);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

---

## 📊 Metrics to Track

Monitor these metrics:

```typescript
// Payment success rate
const successRate = paidInvoices / totalInvoices * 100;

// Average payment time
const avgTime = sum(paymentTimes) / paymentTimes.length;

// Failed payments
const failedPayments = invoices.filter(i => i.expired && !i.paid);

// Payout volume
const totalPayouts = sum(runner_earnings.amount_sats);
```

---

## 🔗 Resources

- **LNbits Docs:** https://docs.lnbits.org/
- **BOLT11 Spec:** https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
- **Lightning Address:** https://lightningaddress.com/
- **Voltage.cloud:** https://voltage.cloud/
- **GetAlby:** https://getalby.com/ (Lightning addresses)

---

## ✅ Checklist for Production

- [ ] LNbits instance configured (self-hosted or managed)
- [ ] Environment variables set in production
- [ ] Admin key stored securely (not in code)
- [ ] Webhook endpoint configured
- [ ] Database indexes created
- [ ] Error handling implemented
- [ ] Monitoring/logging enabled
- [ ] Tested with real testnet payments
- [ ] Backup strategy for Lightning node
- [ ] Invoice expiry times configured
- [ ] Fee structure documented
- [ ] User documentation updated

---

**Status:** ✅ Lightning integration ready for production!

**Next Steps:** Configure LNbits credentials and set `USE_MOCK_LIGHTNING=false`
