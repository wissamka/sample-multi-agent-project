import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { SimulateEmailRequestSchema } from '../schemas/inbox';
import { processInboundEmail } from '../services/ingestion';

const router = Router();

router.post('/simulate', async (req: Request, res: Response) => {
  const parsed = SimulateEmailRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;

  try {
    const profile = await pool.query(
      'SELECT agent_address FROM agent_profiles WHERE user_id = $1',
      [userId]
    );
    if (profile.rows.length === 0) {
      res.status(409).json({ error: 'Complete onboarding before sending email to your agent' });
      return;
    }

    const result = await processInboundEmail(userId, profile.rows[0].agent_address, parsed.data);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM inbound_emails WHERE user_id = $1 ORDER BY received_at DESC',
      [userId]
    );
    res.status(200).json({ emails: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM inbound_emails WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    if (result.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(200).json({ email: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
