import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { CreateMemoryRequestSchema, UpdateMemoryRequestSchema } from '../schemas/memories';
import { insertMemory } from '../services/memoryService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { category } = req.query;

  try {
    const result = category
      ? await pool.query(
          'SELECT * FROM memories WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC',
          [userId, category]
        )
      : await pool.query('SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC', [
          userId,
        ]);
    res.status(200).json({ memories: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateMemoryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;

  try {
    const memory = await insertMemory(userId, { ...parsed.data, source: 'manual' });
    res.status(201).json({ memory });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateMemoryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM memories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Memory not found' });
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

    if (fields.category !== undefined) {
      setClauses.push(`category = $${paramIdx++}`);
      values.push(fields.category);
    }
    if (fields.content !== undefined) {
      setClauses.push(`content = $${paramIdx++}`);
      values.push(fields.content);
    }

    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE memories SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    res.status(200).json({ memory: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM memories WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Memory not found' });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await pool.query('DELETE FROM memories WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
