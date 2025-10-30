import { Router } from 'express';
import { checkDb } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ok: true, service: 'errandbit-api', timestamp: new Date().toISOString() });
});

router.get('/deep', async (req, res) => {
  const db = await checkDb();
  res.json({
    ok: true,
    service: 'errandbit-api',
    timestamp: new Date().toISOString(),
    db
  });
});

export default router;
