import { EmailClassificationResult, MemoryCandidate } from '../../schemas/brain';

export type ClassificationSource = 'heuristic' | 'llm';

export interface BrainContact {
  name: string;
  email: string;
  relationship: 'family' | 'coworker' | 'other';
}

export interface BrainProfile {
  display_name: string;
  timezone: string;
  interests: string[];
}

export interface BrainContext {
  profile: BrainProfile | null;
  contacts: BrainContact[];
}

export interface InboundEmailInput {
  from_name: string | null;
  from_email: string;
  subject: string;
  body: string;
  kind: 'plain' | 'calendar_invite' | 'newsletter' | null;
}

export interface BriefData {
  date: string; // YYYY-MM-DD in the user's timezone
  events: Array<{ title: string; start_at: string; location: string | null }>;
  waiting_on_you: Array<{ summary: string }>;
  open_tasks: Array<{ title: string; status: string; due_date: string | null }>;
  recent_activity: Array<{ summary: string }>;
}

// The pluggable "agent brain". Implementations only PROPOSE classifications,
// summaries, and memory candidates — all side effects (calendar mutations,
// approvals, rule changes) are performed exclusively by deterministic code
// that treats these outputs as untrusted suggestions. This is the
// prompt-injection boundary: nothing an email says can make the brain
// execute an action.
export interface AgentBrain {
  readonly source: ClassificationSource;
  classifyEmail(email: InboundEmailInput, ctx: BrainContext): Promise<EmailClassificationResult>;
  summarizeEmail(email: InboundEmailInput): Promise<string>;
  extractMemories(email: InboundEmailInput, ctx: BrainContext): Promise<MemoryCandidate[]>;
  writeBriefProse(data: BriefData, ctx: BrainContext): Promise<string>;
}
