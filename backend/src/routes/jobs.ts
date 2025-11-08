import { Router, Request, Response } from 'express';

const router = Router();

// POST /jobs
router.post('/', async (req: Request, res: Response): Promise<void> => {
  // TODO: create job
  res.status(201).json({ ok: true, job: { ...req.body, id: 'job_placeholder' } });
});

// GET /jobs/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  // TODO: fetch job
  const { id } = req.params;
  res.json({ id, status: 'requested' });
});

// POST /jobs/:id/accept
router.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, status: 'accepted' });
});

// POST /jobs/:id/decline
router.post('/:id/decline', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, status: 'declined' });
});

// POST /jobs/:id/start
router.post('/:id/start', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, status: 'in_progress' });
});

// POST /jobs/:id/ready-for-payment
router.post('/:id/ready-for-payment', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, status: 'awaiting_payment' });
});

// POST /jobs/:id/mark-paid
router.post('/:id/mark-paid', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, paid_by: 'client' });
});

// POST /jobs/:id/confirm-received
router.post('/:id/confirm-received', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, received_confirmed_by: 'runner' });
});

// POST /jobs/:id/complete
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  res.json({ id, status: 'completed' });
});

export default router;
