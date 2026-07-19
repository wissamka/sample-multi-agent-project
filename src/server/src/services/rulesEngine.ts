import { pool } from '../db/client';

export type RuleTrigger = 'personal_event' | 'work_event' | 'unknown_sender';
export type RuleAction = 'add_family' | 'add_coworkers' | 'ask_user' | 'auto_accept' | 'auto_decline';
export type RuleMode = 'auto' | 'ask';

export interface InviteRuleRow {
  id: string;
  user_id: string;
  name: string;
  trigger: RuleTrigger;
  action: RuleAction;
  mode: RuleMode;
  enabled: boolean;
  position: number;
}

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  relationship: 'family' | 'coworker' | 'other';
}

export interface Attendee {
  name: string;
  email: string;
  added_by: 'organizer' | 'rule' | 'user';
}

export interface EventForRules {
  id: string;
  category: 'personal' | 'work' | 'unknown';
  organizer_email: string | null;
  attendees: Attendee[];
}

export interface RuleDecision {
  rule_id: string;
  rule_name: string;
  action: RuleAction;
  mode: RuleMode;
  proposedAttendees: Attendee[];
}

function contactsToAttendees(contacts: ContactRow[], existing: Attendee[]): Attendee[] {
  const existingEmails = new Set(existing.map((a) => a.email.toLowerCase()));
  return contacts
    .filter((c) => !existingEmails.has(c.email.toLowerCase()))
    .map((c) => ({ name: c.name, email: c.email, added_by: 'rule' as const }));
}

function ruleMatches(rule: InviteRuleRow, event: EventForRules, knownEmails: Set<string>): boolean {
  switch (rule.trigger) {
    case 'personal_event':
      return event.category === 'personal';
    case 'work_event':
      return event.category === 'work';
    case 'unknown_sender':
      return event.organizer_email === null || !knownEmails.has(event.organizer_email.toLowerCase());
  }
}

// Pure decision function: no I/O, no LLM. Given an event, the user's rules,
// and their contacts, produce the ordered list of decisions to apply.
export function evaluateInvite(
  event: EventForRules,
  rules: InviteRuleRow[],
  contacts: ContactRow[]
): RuleDecision[] {
  const knownEmails = new Set(contacts.map((c) => c.email.toLowerCase()));
  const decisions: RuleDecision[] = [];

  const applicable = rules
    .filter((r) => r.enabled && ruleMatches(r, event, knownEmails))
    .sort((a, b) => a.position - b.position);

  for (const rule of applicable) {
    let proposedAttendees: Attendee[] = [];

    if (rule.action === 'add_family') {
      proposedAttendees = contactsToAttendees(
        contacts.filter((c) => c.relationship === 'family'),
        event.attendees
      );
      if (proposedAttendees.length === 0) continue;
    } else if (rule.action === 'add_coworkers') {
      proposedAttendees = contactsToAttendees(
        contacts.filter((c) => c.relationship === 'coworker'),
        event.attendees
      );
      if (proposedAttendees.length === 0) continue;
    }

    decisions.push({
      rule_id: rule.id,
      rule_name: rule.name,
      action: rule.action,
      // ask_user is always a question for the user, regardless of stored mode.
      mode: rule.action === 'ask_user' ? 'ask' : rule.mode,
      proposedAttendees,
    });
  }

  return decisions;
}

function decisionSummary(decision: RuleDecision, eventTitle: string): string {
  switch (decision.action) {
    case 'add_family':
    case 'add_coworkers': {
      const names = decision.proposedAttendees.map((a) => a.name).join(', ');
      const verb = decision.mode === 'auto' ? 'Added' : 'Proposed adding';
      return `${verb} ${names} to "${eventTitle}" (rule: ${decision.rule_name})`;
    }
    case 'ask_user':
      return `"${eventTitle}" needs your review (rule: ${decision.rule_name})`;
    case 'auto_accept':
      return `${decision.mode === 'auto' ? 'Accepted' : 'Proposed accepting'} "${eventTitle}" (rule: ${decision.rule_name})`;
    case 'auto_decline':
      return `${decision.mode === 'auto' ? 'Declined' : 'Proposed declining'} "${eventTitle}" (rule: ${decision.rule_name})`;
  }
}

export interface AppliedDecisions {
  event: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
}

// The side-effecting half. mode='auto' decisions mutate the event and log an
// auto_applied action; mode='ask' decisions only create a pending approval.
export async function applyDecisions(
  userId: string,
  event: EventForRules & { title: string },
  decisions: RuleDecision[],
  relatedEmailId: string | null
): Promise<AppliedDecisions> {
  let attendees = [...event.attendees];
  let status: 'proposed' | 'confirmed' | 'declined' | null = null;
  const actions: Array<Record<string, unknown>> = [];

  for (const decision of decisions) {
    const summary = decisionSummary(decision, event.title);

    if (decision.mode === 'auto') {
      if (decision.action === 'add_family' || decision.action === 'add_coworkers') {
        attendees = [...attendees, ...decision.proposedAttendees];
      } else if (decision.action === 'auto_accept') {
        status = 'confirmed';
      } else if (decision.action === 'auto_decline') {
        status = 'declined';
      }

      const result = await pool.query(
        `INSERT INTO agent_actions (user_id, type, status, summary, payload, related_email_id, related_event_id, resolved_at)
         VALUES ($1, 'rule_applied', 'auto_applied', $2, $3, $4, $5, now())
         RETURNING *`,
        [
          userId,
          summary,
          JSON.stringify({
            event_id: event.id,
            rule_id: decision.rule_id,
            rule_action: decision.action,
            applied_attendees: decision.proposedAttendees,
          }),
          relatedEmailId,
          event.id,
        ]
      );
      actions.push(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO agent_actions (user_id, type, status, summary, payload, related_email_id, related_event_id)
         VALUES ($1, 'invite_proposal', 'pending', $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          summary,
          JSON.stringify({
            event_id: event.id,
            rule_id: decision.rule_id,
            rule_action: decision.action,
            proposed_attendees: decision.proposedAttendees,
          }),
          relatedEmailId,
          event.id,
        ]
      );
      actions.push(result.rows[0]);
    }
  }

  const updated = await pool.query(
    `UPDATE calendar_events
     SET attendees = $1, status = COALESCE($2, status), updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [JSON.stringify(attendees), status, event.id]
  );

  return { event: updated.rows[0], actions };
}

export const DEFAULT_RULES: Array<Pick<InviteRuleRow, 'name' | 'trigger' | 'action' | 'mode' | 'position'>> = [
  { name: 'Personal events include family', trigger: 'personal_event', action: 'add_family', mode: 'ask', position: 0 },
  { name: 'Work events include coworkers', trigger: 'work_event', action: 'add_coworkers', mode: 'ask', position: 1 },
  { name: 'Unknown senders need review', trigger: 'unknown_sender', action: 'ask_user', mode: 'ask', position: 2 },
];

export async function seedDefaultRules(userId: string): Promise<void> {
  for (const rule of DEFAULT_RULES) {
    await pool.query(
      `INSERT INTO invite_rules (user_id, name, trigger, action, mode, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, trigger, action) DO NOTHING`,
      [userId, rule.name, rule.trigger, rule.action, rule.mode, rule.position]
    );
  }
}
