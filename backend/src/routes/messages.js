import { Router } from 'express';

const router = Router();

// GET /jobs/:jobId/messages
router.get('/job/:jobId', async (req, res) => {
  // TODO: return messages for job
  res.json({ jobId: req.params.jobId, messages: [] });
});

// POST /jobs/:jobId/messages
router.post('/job/:jobId', async (req, res) => {
  // TODO: post message to job room
  const { content, media_url, ln_invoice } = req.body || {};
  res.status(201).json({ ok: true, message: { content, media_url, ln_invoice } });
});

export default router;
