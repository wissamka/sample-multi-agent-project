// /src/shared/assistant-types.ts
// Types for the personal-assistant domain. Task-tracker types live in ./types.ts.

import type { Task } from './types';

// ── Enums ───────────────────────────────────────────────────

export type ContactRelationship = 'family' | 'coworker' | 'other';
export type ContactSource = 'onboarding' | 'learned' | 'manual';

export type MemoryCategory = 'fact' | 'preference' | 'contact' | 'note';
export type MemorySource = 'onboarding' | 'email' | 'manual';

export type EmailKind = 'plain' | 'calendar_invite' | 'newsletter';
export type EmailClassification = 'personal' | 'work' | 'newsletter' | 'question' | 'other';
export type ClassificationSource = 'heuristic' | 'llm';
export type EmailStatus = 'received' | 'processed' | 'error';

export type EventCategory = 'personal' | 'work' | 'unknown';
export type EventStatus = 'proposed' | 'confirmed' | 'declined';
export type AttendeeAddedBy = 'organizer' | 'rule' | 'user';

export type RuleTrigger = 'personal_event' | 'work_event' | 'unknown_sender';
export type RuleAction = 'add_family' | 'add_coworkers' | 'ask_user' | 'auto_accept' | 'auto_decline';
export type RuleMode = 'auto' | 'ask';

export type ActionType = 'invite_proposal' | 'question' | 'memory_added' | 'email_filed' | 'rule_applied';
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'info';

export type BriefTrigger = 'manual' | 'scheduled';
export type BriefGeneratedBy = 'heuristic' | 'llm';

// ── Entities ────────────────────────────────────────────────

export interface AgentProfile {
  user_id: string;
  display_name: string;
  timezone: string;
  agent_address: string;
  brief_hour: number;      // 0–23, local hour the scheduled brief fires
  interests: string[];
  onboarded_at: string | null; // null = onboarding wizard not completed
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  relationship: ContactRelationship;
  source: ContactSource;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  source: MemorySource;
  source_email_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvitePayload {
  title: string;
  start_at: string;       // ISO-8601 datetime
  end_at?: string | null;
  location?: string | null;
  organizer?: string | null; // organizer email
}

export interface InboundEmail {
  id: string;
  user_id: string;
  from_name: string | null;
  from_email: string;
  to_address: string;
  subject: string;
  body: string;
  kind: EmailKind | null;
  invite_payload: InvitePayload | null;
  classification: EmailClassification | null;
  classification_source: ClassificationSource | null;
  summary: string | null;
  status: EmailStatus;
  received_at: string;
  processed_at: string | null;
}

export interface Attendee {
  name: string;
  email: string;
  added_by: AttendeeAddedBy;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  organizer_email: string | null;
  attendees: Attendee[];
  category: EventCategory;
  status: EventStatus;
  source_email_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteRule {
  id: string;
  user_id: string;
  name: string;
  trigger: RuleTrigger;
  action: RuleAction;
  mode: RuleMode;
  enabled: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface AgentAction {
  id: string;
  user_id: string;
  type: ActionType;
  status: ActionStatus;
  summary: string;
  payload: Record<string, unknown>;
  related_email_id: string | null;
  related_event_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface BriefContent {
  events: CalendarEvent[];
  waiting_on_you: AgentAction[];
  open_tasks: Task[];
  recent_activity: AgentAction[];
}

export interface Brief {
  id: string;
  user_id: string;
  brief_date: string; // ISO-8601 date
  trigger: BriefTrigger;
  content: BriefContent;
  prose: string;
  generated_by: BriefGeneratedBy;
  created_at: string;
}

// ── Request bodies ──────────────────────────────────────────

export interface ContactInput {
  name: string;
  email: string;
}

export interface OnboardingRequest {
  display_name: string;      // 1–100 chars
  timezone: string;          // IANA zone, e.g. "America/New_York"
  family: ContactInput[];
  coworkers: ContactInput[];
  brief_hour?: number;       // default 8
  interests?: string[];
}

export interface UpdateProfileRequest {
  display_name?: string;
  timezone?: string;
  brief_hour?: number;
  interests?: string[];
}

export interface SimulateEmailRequest {
  from_name?: string;
  from_email: string;
  subject: string;
  body: string;
  kind?: EmailKind;
  invite_payload?: InvitePayload;
}

export interface CreateRuleRequest {
  name: string;
  trigger: RuleTrigger;
  action: RuleAction;
  mode?: RuleMode;
}

export interface UpdateRuleRequest {
  name?: string;
  mode?: RuleMode;
  enabled?: boolean;
  position?: number;
}

export interface CreateMemoryRequest {
  category: MemoryCategory;
  content: string;
}

export interface UpdateMemoryRequest {
  category?: MemoryCategory;
  content?: string;
}

export interface CreateContactRequest {
  name: string;
  email: string;
  relationship: ContactRelationship;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  relationship?: ContactRelationship;
}

export interface CreateEventRequest {
  title: string;
  start_at: string;
  end_at?: string | null;
  location?: string | null;
  category?: EventCategory;
}

export interface UpdateEventRequest {
  title?: string;
  start_at?: string;
  end_at?: string | null;
  location?: string | null;
  status?: EventStatus;
  attendees?: Attendee[];
}

// ── Response envelopes ──────────────────────────────────────

export interface ProfileResponse {
  profile: AgentProfile | null;
}

export interface ContactListResponse {
  contacts: Contact[];
}

export interface ContactResponse {
  contact: Contact;
}

export interface MemoryListResponse {
  memories: Memory[];
}

export interface MemoryResponse {
  memory: Memory;
}

export interface EmailListResponse {
  emails: InboundEmail[];
}

export interface EmailResponse {
  email: InboundEmail;
}

export interface SimulateEmailResponse {
  email: InboundEmail;
  event: CalendarEvent | null;
  actions: AgentAction[];
}

export interface EventListResponse {
  events: CalendarEvent[];
}

export interface EventResponse {
  event: CalendarEvent;
}

export interface RuleListResponse {
  rules: InviteRule[];
}

export interface RuleResponse {
  rule: InviteRule;
}

export interface ActionListResponse {
  actions: AgentAction[];
}

export interface ActionResponse {
  action: AgentAction;
}

export interface BriefResponse {
  brief: Brief;
}

export interface BriefListResponse {
  briefs: Brief[];
}
