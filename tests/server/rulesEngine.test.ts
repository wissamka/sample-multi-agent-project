import { describe, it, expect } from 'vitest';
import {
  evaluateInvite,
  ContactRow,
  EventForRules,
  InviteRuleRow,
  DEFAULT_RULES,
} from '../../src/server/src/services/rulesEngine';

const CONTACTS: ContactRow[] = [
  { id: 'c1', name: 'Mom', email: 'mom@family.com', relationship: 'family' },
  { id: 'c2', name: 'Dad', email: 'dad@family.com', relationship: 'family' },
  { id: 'c3', name: 'Jordan', email: 'jordan@company.com', relationship: 'coworker' },
  { id: 'c4', name: 'Casey', email: 'casey@other.com', relationship: 'other' },
];

function rule(overrides: Partial<InviteRuleRow>): InviteRuleRow {
  return {
    id: 'r1',
    user_id: 'u1',
    name: 'Test rule',
    trigger: 'personal_event',
    action: 'add_family',
    mode: 'ask',
    enabled: true,
    position: 0,
    ...overrides,
  };
}

function event(overrides: Partial<EventForRules>): EventForRules {
  return {
    id: 'e1',
    category: 'personal',
    organizer_email: 'mom@family.com',
    attendees: [],
    ...overrides,
  };
}

describe('evaluateInvite', () => {
  it('proposes family members for a personal event', () => {
    const decisions = evaluateInvite(event({ category: 'personal' }), [rule({})], CONTACTS);

    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe('add_family');
    expect(decisions[0].proposedAttendees.map((a) => a.email)).toEqual([
      'mom@family.com',
      'dad@family.com',
    ]);
    expect(decisions[0].proposedAttendees.every((a) => a.added_by === 'rule')).toBe(true);
  });

  it('proposes coworkers for a work event', () => {
    const decisions = evaluateInvite(
      event({ category: 'work', organizer_email: 'jordan@company.com' }),
      [rule({ trigger: 'work_event', action: 'add_coworkers' })],
      CONTACTS
    );

    expect(decisions).toHaveLength(1);
    expect(decisions[0].proposedAttendees.map((a) => a.email)).toEqual(['jordan@company.com']);
  });

  it('does not match a personal rule against a work event', () => {
    const decisions = evaluateInvite(event({ category: 'work' }), [rule({})], CONTACTS);
    expect(decisions).toHaveLength(0);
  });

  it('fires unknown_sender rule when the organizer is not a contact', () => {
    const rules = [rule({ trigger: 'unknown_sender', action: 'ask_user' })];
    const decisions = evaluateInvite(
      event({ category: 'unknown', organizer_email: 'stranger@nowhere.com' }),
      rules,
      CONTACTS
    );

    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe('ask_user');
    expect(decisions[0].mode).toBe('ask');
  });

  it('does not fire unknown_sender for a known contact organizer', () => {
    const rules = [rule({ trigger: 'unknown_sender', action: 'ask_user' })];
    const decisions = evaluateInvite(
      event({ category: 'unknown', organizer_email: 'MOM@family.com' }),
      rules,
      CONTACTS
    );
    expect(decisions).toHaveLength(0);
  });

  it('treats a null organizer as unknown', () => {
    const rules = [rule({ trigger: 'unknown_sender', action: 'ask_user' })];
    const decisions = evaluateInvite(event({ organizer_email: null }), rules, CONTACTS);
    expect(decisions).toHaveLength(1);
  });

  it('skips disabled rules', () => {
    const decisions = evaluateInvite(event({}), [rule({ enabled: false })], CONTACTS);
    expect(decisions).toHaveLength(0);
  });

  it('skips add rules when every candidate is already an attendee', () => {
    const decisions = evaluateInvite(
      event({
        attendees: [
          { name: 'Mom', email: 'mom@family.com', added_by: 'organizer' },
          { name: 'Dad', email: 'DAD@family.com', added_by: 'user' },
        ],
      }),
      [rule({})],
      CONTACTS
    );
    expect(decisions).toHaveLength(0);
  });

  it('skips add_family when the user has no family contacts', () => {
    const decisions = evaluateInvite(event({}), [rule({})], [CONTACTS[2]]);
    expect(decisions).toHaveLength(0);
  });

  it('preserves stored mode for add rules (auto vs ask)', () => {
    const autoDecisions = evaluateInvite(event({}), [rule({ mode: 'auto' })], CONTACTS);
    expect(autoDecisions[0].mode).toBe('auto');

    const askDecisions = evaluateInvite(event({}), [rule({ mode: 'ask' })], CONTACTS);
    expect(askDecisions[0].mode).toBe('ask');
  });

  it('forces ask mode for ask_user even if stored as auto', () => {
    const decisions = evaluateInvite(
      event({ organizer_email: 'stranger@nowhere.com' }),
      [rule({ trigger: 'unknown_sender', action: 'ask_user', mode: 'auto' })],
      CONTACTS
    );
    expect(decisions[0].mode).toBe('ask');
  });

  it('orders decisions by rule position', () => {
    const rules = [
      rule({ id: 'r-late', trigger: 'unknown_sender', action: 'ask_user', position: 5 }),
      rule({ id: 'r-early', action: 'add_family', position: 1 }),
    ];
    const decisions = evaluateInvite(
      event({ category: 'personal', organizer_email: 'stranger@nowhere.com' }),
      rules,
      CONTACTS
    );
    expect(decisions.map((d) => d.rule_id)).toEqual(['r-early', 'r-late']);
  });

  it('default rules cover the three seeded behaviors', () => {
    expect(DEFAULT_RULES.map((r) => `${r.trigger}:${r.action}`)).toEqual([
      'personal_event:add_family',
      'work_event:add_coworkers',
      'unknown_sender:ask_user',
    ]);
    expect(DEFAULT_RULES.every((r) => r.mode === 'ask')).toBe(true);
  });
});
