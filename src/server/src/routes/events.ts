import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { CreateEventRequestSchema, UpdateEventRequestSchema } from '../schemas/events';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { from, to } = req.query;

  try {
    const clauses = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIdx = 2;

    if (typeof from === 'string' && from) {
      clauses.push(`start_at >= $${paramIdx++}`);
      values.push(from);
    }
    if (typeof to === 'string' && to) {
      clauses.push(`start_at <= $${paramIdx++}`);
      values.push(to);
    }

    const result = await pool.query(
      `SELECT * FROM calendar_events WHERE ${clauses.join(' AND ')} ORDER BY start_at`,
      values
    );
    res.status(200).json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateEventRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { title, start_at, end_at, location, category } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO calendar_events (user_id, title, start_at, end_at, location, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
       RETURNING *`,
      [userId, title, start_at, end_at ?? null, location ?? null, category ?? 'unknown']
    );
    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateEventRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Event not found' });
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

    if (fields.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      values.push(fields.title);
    }
    if (fields.start_at !== undefined) {
      setClauses.push(`start_at = $${paramIdx++}`);
      values.push(fields.start_at);
    }
    if (fields.end_at !== undefined) {
      setClauses.push(`end_at = $${paramIdx++}`);
      values.push(fields.end_at);
    }
    if (fields.location !== undefined) {
      setClauses.push(`location = $${paramIdx++}`);
      values.push(fields.location);
    }
    if (fields.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(fields.status);
    }
    if (fields.attendees !== undefined) {
      setClauses.push(`attendees = $${paramIdx++}`);
      values.push(JSON.stringify(fields.attendees));
    }

    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE calendar_events SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    res.status(200).json({ event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
