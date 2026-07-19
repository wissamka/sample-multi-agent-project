import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { CreateContactRequestSchema, UpdateContactRequestSchema } from '../schemas/contacts';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 ORDER BY relationship, name',
      [userId]
    );
    res.status(200).json({ contacts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = CreateContactRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { name, email, relationship } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO contacts (user_id, name, email, relationship, source)
       VALUES ($1, $2, $3, $4, 'manual')
       RETURNING *`,
      [userId, name, email, relationship]
    );
    res.status(201).json({ contact: result.rows[0] });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'A contact with this email already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateContactRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found' });
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
    if (fields.email !== undefined) {
      setClauses.push(`email = $${paramIdx++}`);
      values.push(fields.email);
    }
    if (fields.relationship !== undefined) {
      setClauses.push(`relationship = $${paramIdx++}`);
      values.push(fields.relationship);
    }

    if (setClauses.length === 0) {
      res.status(200).json({ contact: existing.rows[0] });
      return;
    }

    const result = await pool.query(
      `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      [...values, id]
    );

    res.status(200).json({ contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    if (existing.rows[0].user_id !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
