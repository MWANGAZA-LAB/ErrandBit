import { Router } from 'express';

const router = Router();

// GET /runners/:id
router.get('/:id', async (req, res) => {
  // TODO: fetch runner profile by id
  res.json({ id: req.params.id, display_name: 'Placeholder Runner', tags: [], lightning_address: null });
});

// POST /runners
router.post('/', async (req, res) => {
  // TODO: create runner profile
  res.status(201).json({ ok: true, runner: req.body });
});

// PATCH /runners/:id
router.patch('/:id', async (req, res) => {
  // TODO: update runner profile
  res.json({ ok: true, id: req.params.id, updates: req.body });
});

// GET /runners/search
router.get('/', async (req, res) => {
  // TODO: query by lat,lng,radius, tags
  res.json({ results: [], total: 0 });
});

export default router;
