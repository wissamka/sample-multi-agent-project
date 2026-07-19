import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockQuery = vi.fn();
vi.mock('../../src/server/src/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';

import { app } from '../../src/server/src/index';

function makeToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
}

const USER_ID = 'user-uuid-1';
const EMAIL_ID = 'email-uuid-1';
const EVENT_ID = 'event-uuid-1';

const emailRow = {
  id: EMAIL_ID,
  user_id: USER_ID,
  from_name: 'Jordan Lee',
  from_email: 'jordan.lee@company.com',
  to_address: 'wissam@agent.local',
  subject: 'Invitation: Q3 planning review',
  body: 'You are invited to the Q3 planning review meeting.',
  kind: 'calendar_invite',
  status: 'received',
};

const defaultRules = [
  { id: 'r1', user_id: USER_ID, name: 'Personal events include family', trigger: 'personal_event', action: 'add_family', mode: 'ask', enabled: true, position: 0 },
  { id: 'r2', user_id: USER_ID, name: 'Work events include coworkers', trigger: 'work_event', action: 'add_coworkers', mode: 'ask', enabled: true, position: 1 },
  { id: 'r3', user_id: USER_ID, name: 'Unknown senders need review', trigger: 'unknown_sender', action: 'ask_user', mode: 'ask', enabled: true, position: 2 },
];

const contacts = [
  { id: 'c1', name: 'Mom', email: 'mom@family.com', relationship: 'family' },
  { id: 'c2', name: 'Jordan Lee', email: 'jordan.lee@company.com', relationship: 'coworker' },
  { id: 'c3', name: 'Sam', email: 'sam@company.com', relationship: 'coworker' },
];

function dispatchBySql(handlers: Array<[string, { rows: unknown[] } | Error]>) {
  mockQuery.mockImplementation((sql: string) => {
    for (const [needle, response] of handlers) {
      if (sql.includes(needle)) {
        if (response instanceof Error) return Promise.reject(response);
        return Promise.resolve(response);
      }
    }
    return Promise.resolve({ rows: [] });
  });
}

describe('POST /inbox/simulate', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'wissam@gmail.com');
  });

  const workInvite = {
    from_name: 'Jordan Lee',
    from_email: 'jordan.lee@company.com',
    subject: 'Invitation: Q3 planning review',
    body: 'You are invited to the Q3 planning review meeting.',
    kind: 'calendar_invite',
    invite_payload: {
      title: 'Q3 planning review',
      start_at: '2026-07-20T14:00:00.000Z',
      location: 'Conference Room B',
    },
  };

  function happyPathHandlers(): Array<[string, { rows: unknown[] }]> {
    const eventRow = {
      id: EVENT_ID,
      user_id: USER_ID,
      title: 'Q3 planning review',
      category: 'work',
      organizer_email: 'jordan.lee@company.com',
      attendees: [{ name: 'Jordan Lee', email: 'jordan.lee@company.com', added_by: 'organizer' }],
      status: 'proposed',
    };
    return [
      ['SELECT agent_address FROM agent_profiles', { rows: [{ agent_address: 'wissam@agent.local' }] }],
      ['INSERT INTO inbound_emails', { rows: [emailRow] }],
      ['SELECT display_name, timezone, interests', { rows: [{ display_name: 'Wissam', timezone: 'UTC', interests: [] }] }],
      ['FROM contacts', { rows: contacts }],
      ['INSERT INTO calendar_events', { rows: [eventRow] }],
      ['FROM invite_rules', { rows: defaultRules }],
      [
        'INSERT INTO agent_actions',
        {
          rows: [
            {
              id: 'a1',
              user_id: USER_ID,
              type: 'invite_proposal',
              status: 'pending',
              summary: 'Proposed adding Sam to "Q3 planning review"',
            },
          ],
        },
      ],
      ['UPDATE calendar_events', { rows: [eventRow] }],
      ["SET status = 'processed'", { rows: [{ ...emailRow, status: 'processed', classification: 'work' }] }],
    ];
  }

  it('processes a work invite: classifies, creates event, proposes coworkers', async () => {
    dispatchBySql(happyPathHandlers());

    const res = await request(app)
      .post('/inbox/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send(workInvite);

    expect(res.status).toBe(201);
    expect(res.body.email.status).toBe('processed');
    expect(res.body.event).not.toBeNull();
    expect(res.body.actions.length).toBeGreaterThan(0);
    expect(res.body.actions[0].status).toBe('pending');

    // Classification (from coworker sender) recorded on the email row.
    const classifyUpdate = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('SET classification')
    )!;
    expect(classifyUpdate[1][0]).toBe('work');
    expect(classifyUpdate[1][1]).toBe('heuristic');

    // The pending proposal only includes coworkers who are not yet attendees
    // (Jordan is the organizer, so only Sam is proposed).
    const actionInsert = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO agent_actions')
    )!;
    const payload = JSON.parse(actionInsert[1][2] as string);
    expect(payload.rule_action).toBe('add_coworkers');
    expect(payload.proposed_attendees.map((a: { email: string }) => a.email)).toEqual([
      'sam@company.com',
    ]);
    expect(String(actionInsert[0])).toContain("'pending'");
  });

  it('returns 409 before onboarding', async () => {
    dispatchBySql([['SELECT agent_address FROM agent_profiles', { rows: [] }]]);

    const res = await request(app)
      .post('/inbox/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send(workInvite);

    expect(res.status).toBe(409);
  });

  it('returns 422 for a calendar invite without invite_payload', async () => {
    const res = await request(app)
      .post('/inbox/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...workInvite, invite_payload: undefined });

    expect(res.status).toBe(422);
  });

  it('marks the email as error and returns 500 when the pipeline fails', async () => {
    const handlers = happyPathHandlers().filter(
      ([needle]) => needle !== 'INSERT INTO calendar_events'
    );
    dispatchBySql([
      ...handlers,
      ['INSERT INTO calendar_events', new Error('db exploded')],
    ]);

    const res = await request(app)
      .post('/inbox/simulate')
      .set('Authorization', `Bearer ${token}`)
      .send(workInvite);

    expect(res.status).toBe(500);
    const errorUpdate = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes("SET status = 'error'")
    );
    expect(errorUpdate).toBeDefined();
  });
});

describe('GET /inbox', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'wissam@gmail.com');
  });

  it('lists the user emails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [emailRow] });

    const res = await request(app).get('/inbox').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.emails).toHaveLength(1);
  });

  it('returns 403 for another user email detail', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...emailRow, user_id: 'someone-else' }] });

    const res = await request(app)
      .get(`/inbox/${EMAIL_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
