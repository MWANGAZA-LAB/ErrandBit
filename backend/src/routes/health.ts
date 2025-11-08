import { Router, Request, Response } from 'express';
import { checkDb } from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'errandbit-api', timestamp: new Date().toISOString() });
});

router.get('/deep', async (_req: Request, res: Response) => {
  const db = await checkDb();
  res.json({
    ok: true,
    service: 'errandbit-api',
    timestamp: new Date().toISOString(),
    db
  });
});

export default router;
