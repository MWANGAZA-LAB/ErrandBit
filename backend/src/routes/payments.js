import { Router } from 'express';

const router = Router();

// GET /payments/instruction?job_id=...
router.get('/instruction', async (req, res) => {
  const { job_id } = req.query;
  // TODO: look up job price and runner lightning address
  res.json({
    job_id,
    amount_sats: 1000,
    fiat_equiv_usd: 0.5,
    runner: { lightning_address: 'runner@example.com' }
  });
});

// POST /payments/validate-invoice
router.post('/validate-invoice', async (req, res) => {
  const { job_id, bolt11 } = req.body || {};
  // TODO: call LNBits or provider to validate
  res.json({ job_id, is_valid: true, amount_ok: true, expires_at: new Date(Date.now() + 10*60*1000).toISOString() });
});

// POST /payments/confirm
router.post('/confirm', async (req, res) => {
  const { job_id, by } = req.body || {};
  res.json({ ok: true, job_id, confirmed_by: by || 'client' });
});

export default router;
