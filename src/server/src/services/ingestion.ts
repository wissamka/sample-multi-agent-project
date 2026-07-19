import { pool } from '../db/client';
import { getBrain } from './brain';
import { BrainContext, InboundEmailInput } from './brain/types';
import { insertMemory } from './memoryService';
import {
  Attendee,
  ContactRow,
  EventForRules,
  InviteRuleRow,
  applyDecisions,
  evaluateInvite,
} from './rulesEngine';

export interface SimulatedEmail {
  from_name?: string;
  from_email: string;
  subject: string;
  body: string;
  kind?: 'plain' | 'calendar_invite' | 'newsletter';
  invite_payload?: {
    title: string;
    start_at: string;
    end_at?: string | null;
    location?: string | null;
    organizer?: string | null;
  };
}

export interface IngestionResult {
  email: Record<string, unknown>;
  event: Record<string, unknown> | null;
  actions: Array<Record<string, unknown>>;
}

// The ingestion pipeline. Deliberately synchronous: the simulator UI shows
// the agent's work product immediately. The brain only proposes labels and
// text; every mutation below is deterministic code.
export async function processInboundEmail(
  userId: string,
  toAddress: string,
  input: SimulatedEmail
): Promise<IngestionResult> {
  const inserted = await pool.query(
    `INSERT INTO inbound_emails (user_id, from_name, from_email, to_address, subject, body, kind, invite_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      input.from_name ?? null,
      input.from_email,
      toAddress,
      input.subject,
      input.body,
      input.kind ?? 'plain',
      input.invite_payload ? JSON.stringify(input.invite_payload) : null,
    ]
  );
  const emailRow = inserted.rows[0];

  try {
    const profileResult = await pool.query(
      'SELECT display_name, timezone, interests FROM agent_profiles WHERE user_id = $1',
      [userId]
    );
    const contactsResult = await pool.query(
      'SELECT id, name, email, relationship FROM contacts WHERE user_id = $1',
      [userId]
    );
    const contacts = contactsResult.rows as ContactRow[];

    const ctx: BrainContext = {
      profile: profileResult.rows[0] ?? null,
      contacts,
    };

    const brainInput: InboundEmailInput = {
      from_name: input.from_name ?? null,
      from_email: input.from_email,
      subject: input.subject,
      body: input.body,
      kind: input.kind ?? 'plain',
    };

    const brain = getBrain();
    const classification = await brain.classifyEmail(brainInput, ctx);
    const summary = await brain.summarizeEmail(brainInput);

    await pool.query(
      `UPDATE inbound_emails
       SET classification = $1, classification_source = $2, summary = $3
       WHERE id = $4`,
      [classification.classification, brain.source, summary, emailRow.id]
    );

    let event: Record<string, unknown> | null = null;
    let actions: Array<Record<string, unknown>> = [];

    if (input.kind === 'calendar_invite' && input.invite_payload) {
      const payload = input.invite_payload;
      const organizerEmail = payload.organizer ?? input.from_email;
      const category =
        classification.classification === 'personal' || classification.classification === 'work'
          ? classification.classification
          : 'unknown';

      const organizerAttendee: Attendee = {
        name: input.from_name ?? organizerEmail,
        email: organizerEmail,
        added_by: 'organizer',
      };

      const createdEvent = await pool.query(
        `INSERT INTO calendar_events (user_id, title, start_at, end_at, location, organizer_email, attendees, category, source_email_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId,
          payload.title,
          payload.start_at,
          payload.end_at ?? null,
          payload.location ?? null,
          organizerEmail,
          JSON.stringify([organizerAttendee]),
          category,
          emailRow.id,
        ]
      );
      const eventRow = createdEvent.rows[0];

      const rulesResult = await pool.query(
        'SELECT * FROM invite_rules WHERE user_id = $1 ORDER BY position',
        [userId]
      );

      const eventForRules: EventForRules & { title: string } = {
        id: eventRow.id,
        title: eventRow.title,
        category: eventRow.category,
        organizer_email: eventRow.organizer_email,
        attendees: eventRow.attendees ?? [],
      };

      const decisions = evaluateInvite(eventForRules, rulesResult.rows as InviteRuleRow[], contacts);
      const applied = await applyDecisions(userId, eventForRules, decisions, emailRow.id);
      event = applied.event;
      actions = applied.actions;
    }

    const memoryCandidates = await brain.extractMemories(brainInput, ctx);
    for (const candidate of memoryCandidates) {
      const memory = await insertMemory(userId, {
        category: candidate.category,
        content: candidate.content,
        source: 'email',
        source_email_id: emailRow.id as string,
      });
      const logged = await pool.query(
        `INSERT INTO agent_actions (user_id, type, status, summary, payload, related_email_id, resolved_at)
         VALUES ($1, 'memory_added', 'info', $2, $3, $4, now())
         RETURNING *`,
        [
          userId,
          `Remembered: ${candidate.content}`,
          JSON.stringify({ memory_id: memory.id }),
          emailRow.id,
        ]
      );
      actions.push(logged.rows[0]);
    }

    const finalEmail = await pool.query(
      `UPDATE inbound_emails SET status = 'processed', processed_at = now() WHERE id = $1 RETURNING *`,
      [emailRow.id]
    );

    return { email: finalEmail.rows[0], event, actions };
  } catch (err) {
    await pool.query(`UPDATE inbound_emails SET status = 'error' WHERE id = $1`, [emailRow.id]);
    throw err;
  }
}
