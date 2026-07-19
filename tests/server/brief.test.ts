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

const openTask = {
  id: 't1',
  user_id: USER_ID,
  title: 'Book flights',
  status: 'todo',
  due_date: null,
};

const pendingAction = {
  id: 'a1',
  user_id: USER_ID,
  type: 'invite_proposal',
  status: 'pending',
  summary: 'Proposed adding Sam to "Q3 planning review"',
};

const todayEvent = {
  id: 'e1',
  user_id: USER_ID,
  title: 'Q3 planning review',
  start_at: '2026-07-19T14:00:00.000Z',
  location: 'Room B',
};

function dispatchBySql(handlers: Array<[string, { rows: unknown[] }]>) {
  mockQuery.mockImplementation((sql: string) => {
    for (const [needle, response] of handlers) {
      if (sql.includes(needle)) return Promise.resolve(response);
    }
    return Promise.resolve({ rows: [] });
  });
}

function happyHandlers(): Array<[string, { rows: unknown[] }]> {
  return [
    [
      'SELECT display_name, timezone, interests',
      { rows: [{ display_name: 'Wissam', timezone: 'UTC', interests: [] }] },
    ],
    ['FROM calendar_events', { rows: [todayEvent] }],
    ["status = 'pending'", { rows: [pendingAction] }],
    ['FROM tasks', { rows: [openTask] }],
    ["status != 'pending'", { rows: [] }],
    ['FROM contacts', { rows: [] }],
    [
      'INSERT INTO briefs',
      {
        rows: [
          {
            id: 'b1',
            user_id: USER_ID,
            brief_date: '2026-07-19',
            trigger: 'manual',
            prose: 'stub',
            generated_by: 'heuristic',
          },
        ],
      },
    ],
  ];
}

describe('Brief routes', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'wissam@gmail.com');
  });

  it('POST /brief/generate assembles events, pending items, and open tasks', async () => {
    dispatchBySql(happyHandlers());

    const res = await request(app)
      .post('/brief/generate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.brief.id).toBe('b1');

    const insert = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO briefs'))!;
    const [userId, , trigger, contentJson, prose, generatedBy] = insert[1] as string[];
    expect(userId).toBe(USER_ID);
    expect(trigger).toBe('manual');
    expect(generatedBy).toBe('heuristic');

    const content = JSON.parse(contentJson);
    expect(content.events).toHaveLength(1);
    expect(content.waiting_on_you).toHaveLength(1);
    expect(content.open_tasks[0].title).toBe('Book flights');

    expect(prose).toContain('Q3 planning review');
    expect(prose).toContain('1 open task');
  });

  it('POST /brief/tick records a scheduled trigger', async () => {
    dispatchBySql(happyHandlers());

    const res = await request(app).post('/brief/tick').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    const insert = mockQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO briefs'))!;
    expect(insert[1][2]).toBe('scheduled');
  });

  it('GET /brief/latest returns null when no brief exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/brief/latest').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.brief).toBeNull();
  });
});
