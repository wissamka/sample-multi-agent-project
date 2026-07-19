import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { OnboardingRequestSchema, UpdateProfileRequestSchema } from '../schemas/profile';
import { seedDefaultRules } from '../services/rulesEngine';
import { insertMemory } from '../services/memoryService';

const router = Router();

function agentDomain(): string {
  return process.env.AGENT_EMAIL_DOMAIN ?? 'agent.local';
}

async function deriveAgentAddress(userId: string, userEmail: string): Promise<string> {
  const localPart = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'agent';
  const domain = agentDomain();

  let candidate = `${localPart}@${domain}`;
  for (let suffix = 2; suffix <= 10; suffix++) {
    const existing = await pool.query(
      'SELECT user_id FROM agent_profiles WHERE agent_address = $1',
      [candidate]
    );
    if (existing.rows.length === 0 || existing.rows[0].user_id === userId) {
      return candidate;
    }
    candidate = `${localPart}-${suffix}@${domain}`;
  }
  return `${localPart}-${userId.slice(0, 8)}@${domain}`;
}

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  try {
    const result = await pool.query('SELECT * FROM agent_profiles WHERE user_id = $1', [userId]);
    res.status(200).json({ profile: result.rows[0] ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/onboarding', async (req: Request, res: Response) => {
  const parsed = OnboardingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const { display_name, timezone, family, coworkers, brief_hour, interests } = parsed.data;

  try {
    const existing = await pool.query(
      'SELECT onboarded_at FROM agent_profiles WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0 && existing.rows[0].onboarded_at !== null) {
      res.status(409).json({ error: 'Onboarding already completed' });
      return;
    }

    const agentAddress = await deriveAgentAddress(userId, req.user!.email);

    const profileResult = await pool.query(
      `INSERT INTO agent_profiles (user_id, display_name, timezone, agent_address, brief_hour, interests, onboarded_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             timezone = EXCLUDED.timezone,
             agent_address = EXCLUDED.agent_address,
             brief_hour = EXCLUDED.brief_hour,
             interests = EXCLUDED.interests,
             onboarded_at = now(),
             updated_at = now()
       RETURNING *`,
      [userId, display_name, timezone, agentAddress, brief_hour ?? 8, interests ?? []]
    );

    for (const contact of family) {
      await pool.query(
        `INSERT INTO contacts (user_id, name, email, relationship, source)
         VALUES ($1, $2, $3, 'family', 'onboarding')
         ON CONFLICT (user_id, email) DO NOTHING`,
        [userId, contact.name, contact.email]
      );
    }
    for (const contact of coworkers) {
      await pool.query(
        `INSERT INTO contacts (user_id, name, email, relationship, source)
         VALUES ($1, $2, $3, 'coworker', 'onboarding')
         ON CONFLICT (user_id, email) DO NOTHING`,
        [userId, contact.name, contact.email]
      );
    }

    await seedDefaultRules(userId);

    await insertMemory(userId, {
      category: 'preference',
      content: `Prefers the daily brief at ${String(brief_hour ?? 8).padStart(2, '0')}:00 (${timezone})`,
      source: 'onboarding',
    });
    for (const interest of interests ?? []) {
      await insertMemory(userId, {
        category: 'preference',
        content: `Interested in ${interest}`,
        source: 'onboarding',
      });
    }

    res.status(201).json({ profile: profileResult.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/', async (req: Request, res: Response) => {
  const parsed = UpdateProfileRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.errors[0].message });
    return;
  }

  const userId = req.user!.userId;
  const fields = parsed.data;

  try {
    const existing = await pool.query('SELECT user_id FROM agent_profiles WHERE user_id = $1', [userId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (fields.display_name !== undefined) {
      setClauses.push(`display_name = $${paramIdx++}`);
      values.push(fields.display_name);
    }
    if (fields.timezone !== undefined) {
      setClauses.push(`timezone = $${paramIdx++}`);
      values.push(fields.timezone);
    }
    if (fields.brief_hour !== undefined) {
      setClauses.push(`brief_hour = $${paramIdx++}`);
      values.push(fields.brief_hour);
    }
    if (fields.interests !== undefined) {
      setClauses.push(`interests = $${paramIdx++}`);
      values.push(fields.interests);
    }

    setClauses.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE agent_profiles SET ${setClauses.join(', ')} WHERE user_id = $${paramIdx} RETURNING *`,
      [...values, userId]
    );

    res.status(200).json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
