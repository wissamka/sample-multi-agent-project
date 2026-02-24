import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/client';
import { RegisterRequestSchema, LoginRequestSchema } from '../schemas/auth';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query('SELECT id, email, password FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.status(204).send();
});

export default router;
