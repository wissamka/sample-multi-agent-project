import { pool } from '../db/client';
import { getBrain } from './brain';
import { BrainContext, BriefData } from './brain/types';

// YYYY-MM-DD for "today" in the user's timezone (en-CA locale formats as ISO).
export function todayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function generateBrief(
  userId: string,
  trigger: 'manual' | 'scheduled'
): Promise<Record<string, unknown>> {
  const profileResult = await pool.query(
    'SELECT display_name, timezone, interests FROM agent_profiles WHERE user_id = $1',
    [userId]
  );
  const profile = profileResult.rows[0] ?? null;
  const timezone = profile?.timezone ?? 'UTC';
  const briefDate = todayInTimezone(timezone);

  const eventsResult = await pool.query(
    `SELECT * FROM calendar_events
     WHERE user_id = $1
       AND status != 'declined'
       AND (start_at AT TIME ZONE $2)::date = $3::date
     ORDER BY start_at`,
    [userId, timezone, briefDate]
  );

  const pendingResult = await pool.query(
    `SELECT * FROM agent_actions
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC`,
    [userId]
  );

  const tasksResult = await pool.query(
    `SELECT * FROM tasks
     WHERE user_id = $1 AND status != 'done'
     ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    [userId]
  );

  const activityResult = await pool.query(
    `SELECT * FROM agent_actions
     WHERE user_id = $1 AND status != 'pending'
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );

  const content = {
    events: eventsResult.rows,
    waiting_on_you: pendingResult.rows,
    open_tasks: tasksResult.rows,
    recent_activity: activityResult.rows,
  };

  const contactsResult = await pool.query(
    'SELECT id, name, email, relationship FROM contacts WHERE user_id = $1',
    [userId]
  );
  const ctx: BrainContext = { profile, contacts: contactsResult.rows };

  const briefData: BriefData = {
    date: briefDate,
    events: content.events.map((e) => ({
      title: e.title,
      start_at: e.start_at instanceof Date ? e.start_at.toISOString() : String(e.start_at),
      location: e.location,
    })),
    waiting_on_you: content.waiting_on_you.map((a) => ({ summary: a.summary })),
    open_tasks: content.open_tasks.map((t) => ({
      title: t.title,
      status: t.status,
      due_date: t.due_date,
    })),
    recent_activity: content.recent_activity.map((a) => ({ summary: a.summary })),
  };

  const brain = getBrain();
  const prose = await brain.writeBriefProse(briefData, ctx);

  const inserted = await pool.query(
    `INSERT INTO briefs (user_id, brief_date, trigger, content, prose, generated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, briefDate, trigger, JSON.stringify(content), prose, brain.source]
  );

  return inserted.rows[0];
}
