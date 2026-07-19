import { EmailClassificationResult, MemoryCandidate } from '../../schemas/brain';
import { AgentBrain, BrainContext, BriefData, InboundEmailInput } from './types';

const WORK_PATTERN = /\b(meeting|standup|stand-up|sync|review|sprint|1:1|deadline|quarterly|retro)\b/i;
const PERSONAL_PATTERN = /\b(birthday|party|dinner|bbq|barbecue|wedding|anniversary|brunch|vacation)\b/i;
const NEWSLETTER_PATTERN = /\b(unsubscribe|newsletter|view in browser|manage preferences)\b/i;
const PREFERENCE_PATTERN = /[^.!?\n]*\b(i (?:like|love|prefer|hate)|my favorite)\b[^.!?\n]*/i;

function findContact(ctx: BrainContext, email: string) {
  const normalized = email.toLowerCase();
  return ctx.contacts.find((c) => c.email.toLowerCase() === normalized);
}

export class HeuristicBrain implements AgentBrain {
  readonly source = 'heuristic' as const;

  async classifyEmail(email: InboundEmailInput, ctx: BrainContext): Promise<EmailClassificationResult> {
    const text = `${email.subject}\n${email.body}`;

    if (email.kind === 'newsletter' || NEWSLETTER_PATTERN.test(text)) {
      return { classification: 'newsletter', confidence: 0.9 };
    }

    const sender = findContact(ctx, email.from_email);
    if (sender?.relationship === 'family') {
      return { classification: 'personal', confidence: 0.9 };
    }
    if (sender?.relationship === 'coworker') {
      return { classification: 'work', confidence: 0.9 };
    }

    if (WORK_PATTERN.test(text)) {
      return { classification: 'work', confidence: 0.6 };
    }
    if (PERSONAL_PATTERN.test(text)) {
      return { classification: 'personal', confidence: 0.6 };
    }

    const questionMarks = (email.body.match(/\?/g) ?? []).length;
    if (questionMarks >= 2 || /\?\s*$/.test(email.body.trim())) {
      return { classification: 'question', confidence: 0.5 };
    }

    return { classification: 'other', confidence: 0.3 };
  }

  async summarizeEmail(email: InboundEmailInput): Promise<string> {
    const from = email.from_name ?? email.from_email;
    const firstLine = email.body.replace(/\s+/g, ' ').trim();
    const snippet = firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
    return `${from}: ${email.subject} — ${snippet}`;
  }

  async extractMemories(email: InboundEmailInput, ctx: BrainContext): Promise<MemoryCandidate[]> {
    const candidates: MemoryCandidate[] = [];

    const preference = email.body.match(PREFERENCE_PATTERN);
    if (preference) {
      const sender = findContact(ctx, email.from_email);
      const who = sender?.name ?? email.from_name ?? email.from_email;
      candidates.push({
        category: 'preference',
        content: `${who} said: "${preference[0].trim()}"`,
      });
    }

    return candidates.slice(0, 5);
  }

  async writeBriefProse(data: BriefData, ctx: BrainContext): Promise<string> {
    const name = ctx.profile?.display_name ?? 'there';
    const parts: string[] = [`Good morning, ${name}! Here's your day for ${data.date}.`];

    if (data.events.length === 0) {
      parts.push('Your calendar is clear today.');
    } else {
      const list = data.events
        .map((e) => `${e.title} at ${new Date(e.start_at).toISOString().slice(11, 16)}${e.location ? ` (${e.location})` : ''}`)
        .join('; ');
      parts.push(`You have ${data.events.length} event${data.events.length === 1 ? '' : 's'}: ${list}.`);
    }

    if (data.waiting_on_you.length > 0) {
      parts.push(
        `Waiting on you: ${data.waiting_on_you.map((a) => a.summary).join('; ')}.`
      );
    }

    if (data.open_tasks.length > 0) {
      parts.push(`You have ${data.open_tasks.length} open task${data.open_tasks.length === 1 ? '' : 's'} on your board.`);
    }

    if (data.recent_activity.length > 0) {
      parts.push(`Recently I handled: ${data.recent_activity.map((a) => a.summary).join('; ')}.`);
    }

    return parts.join(' ');
  }
}
