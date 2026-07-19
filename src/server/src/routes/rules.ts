import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { CreateRuleRequestSchema, UpdateRuleRequestSchema } from '../schemas/rules';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM invite_rules WHERE user_id = $1 ORDER BY position, created_at',
      [userId]
    );
    res.status(200).json({ rules: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateRuleRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { name, trigger, action, mode } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO invite_rules (user_id, name, trigger, action, mode, position)
       VALUES ($1, $2, $3, $4, $5,
         (SELECT COALESCE(MAX(position) + 1, 0) FROM invite_rules WHERE user_id = $1))
       RETURNING *`,
      [userId, name, trigger, action, mode ?? 'ask']
    );
    res.status(201).json({ rule: result.rows[0] });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A rule with this trigger and action already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateRuleRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM invite_rules WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const fields = parsed.data;
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (fields.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      values.push(fields.name);
    }
    if (fields.mode !== undefined) {
      setClauses.push(`mode = $${paramIdx++}`);
      values.push(fields.mode);
    }
    if (fields.enabled !== undefined) {
      setClauses.push(`enabled = $${paramIdx++}`);
      values.push(fields.enabled);
    }
    if (fields.position !== undefined) {
      setClauses.push(`position = $${paramIdx++}`);
      values.push(fields.position);
    }

    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE invite_rules SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    res.status(200).json({ rule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM invite_rules WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await pool.query('DELETE FROM invite_rules WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
