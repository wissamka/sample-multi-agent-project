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
const ACTION_ID = 'action-uuid-1';
const EVENT_ID = 'event-uuid-1';

const pendingAction = {
  id: ACTION_ID,
  user_id: USER_ID,
  type: 'invite_proposal',
  status: 'pending',
  summary: 'Proposed adding Sam to "Q3 planning review"',
  payload: {
    event_id: EVENT_ID,
    rule_id: 'r2',
    rule_action: 'add_coworkers',
    proposed_attendees: [{ name: 'Sam', email: 'sam@company.com', added_by: 'rule' }],
  },
  related_email_id: null,
  related_event_id: EVENT_ID,
};

const eventRow = {
  id: EVENT_ID,
  user_id: USER_ID,
  title: 'Q3 planning review',
  attendees: [{ name: 'Jordan', email: 'jordan@company.com', added_by: 'organizer' }],
};

describe('Action routes', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'wissam@gmail.com');
  });

  it('lists pending actions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [pendingAction] });

    const res = await request(app)
      .get('/actions?status=pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.actions).toHaveLength(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([USER_ID, 'pending']);
  });

  it('approve applies proposed attendees to the related event', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [pendingAction] }) // load action
      .mockResolvedValueOnce({ rows: [eventRow] }) // load event
      .mockResolvedValueOnce({ rows: [] }) // update event
      .mockResolvedValueOnce({ rows: [{ ...pendingAction, status: 'approved' }] });

    const res = await request(app)
      .post(`/actions/${ACTION_ID}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.action.status).toBe('approved');

    const eventUpdate = mockQuery.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE calendar_events')
    )!;
    const attendees = JSON.parse(eventUpdate[1][0] as string);
    expect(attendees.map((a: { email: string }) => a.email)).toEqual([
      'jordan@company.com',
      'sam@company.com',
    ]);
  });

  it('reject resolves the action without touching the event', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [pendingAction] })
      .mockResolvedValueOnce({ rows: [{ ...pendingAction, status: 'rejected' }] });

    const res = await request(app)
      .post(`/actions/${ACTION_ID}/reject`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.action.status).toBe('rejected');
    const eventUpdates = mockQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('UPDATE calendar_events')
    );
    expect(eventUpdates).toHaveLength(0);
  });

  it("returns 403 for another user's action", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...pendingAction, user_id: 'someone-else' }] });

    const res = await request(app)
      .post(`/actions/${ACTION_ID}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 409 when the action is not pending', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...pendingAction, status: 'approved' }] });

    const res = await request(app)
      .post(`/actions/${ACTION_ID}/approve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('returns 404 for a missing action', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post(`/actions/${ACTION_ID}/reject`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
