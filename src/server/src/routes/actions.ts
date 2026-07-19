import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { Attendee } from '../services/rulesEngine';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { status } = req.query;

  try {
    const result = status
      ? await pool.query(
          'SELECT * FROM agent_actions WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
          [userId, status]
        )
      : await pool.query(
          'SELECT * FROM agent_actions WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
    res.status(200).json({ actions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function loadPendingAction(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { id } = req.params;

  const existing = await pool.query('SELECT * FROM agent_actions WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Action not found' });
    return null;
  }
  if (existing.rows[0].user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  if (existing.rows[0].status !== 'pending') {
    res.status(409).json({ error: 'Action is not pending' });
    return null;
  }
  return existing.rows[0];
}

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const action = await loadPendingAction(req, res);
    if (!action) return;

    // Approving an invite proposal applies the deterministic payload the
    // rules engine recorded: add proposed attendees to the related event.
    if (action.type === 'invite_proposal' && action.related_event_id) {
      const proposed = (action.payload?.proposed_attendees ?? []) as Attendee[];
      if (proposed.length > 0) {
        const eventResult = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [
          action.related_event_id,
        ]);
        if (eventResult.rows.length > 0) {
          const event = eventResult.rows[0];
          const existingEmails = new Set(
            (event.attendees as Attendee[]).map((a) => a.email.toLowerCase())
          );
          const merged = [
            ...event.attendees,
            ...proposed.filter((a) => !existingEmails.has(a.email.toLowerCase())),
          ];
          await pool.query(
            `UPDATE calendar_events SET attendees = $1, updated_at = now() WHERE id = $2`,
            [JSON.stringify(merged), event.id]
          );
        }
      }
    }

    const result = await pool.query(
      `UPDATE agent_actions SET status = 'approved', resolved_at = now() WHERE id = $1 RETURNING *`,
      [action.id]
    );
    res.status(200).json({ action: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const action = await loadPendingAction(req, res);
    if (!action) return;

    const result = await pool.query(
      `UPDATE agent_actions SET status = 'rejected', resolved_at = now() WHERE id = $1 RETURNING *`,
      [action.id]
    );
    res.status(200).json({ action: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
