import { Router } from 'express';

const router = Router();

// POST /jobs
router.post('/', async (req, res) => {
  // TODO: create job
  res.status(201).json({ ok: true, job: { ...req.body, id: 'job_placeholder' } });
});

// GET /jobs/:id
router.get('/:id', async (req, res) => {
  // TODO: fetch job
  res.json({ id: req.params.id, status: 'requested' });
});

// POST /jobs/:id/accept
router.post('/:id/accept', async (req, res) => {
  res.json({ id: req.params.id, status: 'accepted' });
});

// POST /jobs/:id/decline
router.post('/:id/decline', async (req, res) => {
  res.json({ id: req.params.id, status: 'declined' });
});

// POST /jobs/:id/start
router.post('/:id/start', async (req, res) => {
  res.json({ id: req.params.id, status: 'in_progress' });
});

// POST /jobs/:id/ready-for-payment
router.post('/:id/ready-for-payment', async (req, res) => {
  res.json({ id: req.params.id, status: 'awaiting_payment' });
});

// POST /jobs/:id/mark-paid
router.post('/:id/mark-paid', async (req, res) => {
  res.json({ id: req.params.id, paid_by: 'client' });
});

// POST /jobs/:id/confirm-received
router.post('/:id/confirm-received', async (req, res) => {
  res.json({ id: req.params.id, received_confirmed_by: 'runner' });
});

// POST /jobs/:id/complete
router.post('/:id/complete', async (req, res) => {
  res.json({ id: req.params.id, status: 'completed' });
});

export default router;
