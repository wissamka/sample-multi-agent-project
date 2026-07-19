import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { generateBrief } from '../services/briefGenerator';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const brief = await generateBrief(req.user!.userId, 'manual');
    res.status(201).json({ brief });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulated scheduler firing. In production this is where a cron/queue
// worker would call generateBrief at each user's configured brief_hour.
router.post('/tick', async (req: Request, res: Response) => {
  try {
    const brief = await generateBrief(req.user!.userId, 'scheduled');
    res.status(201).json({ brief });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/latest', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM briefs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user!.userId]
    );
    res.status(200).json({ brief: result.rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM briefs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.user!.userId]
    );
    res.status(200).json({ briefs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
