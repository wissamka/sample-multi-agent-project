import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { CreateTaskRequestSchema, UpdateTaskRequestSchema } from '../schemas/tasks';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateTaskRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { title, description, status, due_date } = parsed.data;
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, title, description ?? null, status ?? 'todo', due_date ?? null]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json({ tasks: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateTaskRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
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
    if (fields.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(fields.description);
    }
    if (fields.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(fields.status);
    }
    if (fields.due_date !== undefined) {
      setClauses.push(`due_date = $${paramIdx++}`);
      values.push(fields.due_date);
    }

    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    res.status(200).json({ task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
