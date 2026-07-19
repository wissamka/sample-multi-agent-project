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

const profileRow = {
  user_id: USER_ID,
  display_name: 'Wissam',
  timezone: 'America/New_York',
  agent_address: 'wissam@agent.local',
  brief_hour: 8,
  interests: ['travel'],
  onboarded_at: '2026-07-19T00:00:00.000Z',
  created_at: '2026-07-19T00:00:00.000Z',
  updated_at: '2026-07-19T00:00:00.000Z',
};

// Dispatch mock responses by SQL substring so tests are not coupled to the
// exact number/order of queries in the route.
function dispatchBySql(handlers: Array<[string, { rows: unknown[] }]>) {
  mockQuery.mockImplementation((sql: string) => {
    for (const [needle, response] of handlers) {
      if (sql.includes(needle)) return Promise.resolve(response);
    }
    return Promise.resolve({ rows: [] });
  });
}

describe('Profile routes', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'wissam@gmail.com');
  });

  describe('GET /profile', () => {
    it('returns null profile when not onboarded', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/profile').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.profile).toBeNull();
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /profile/onboarding', () => {
    const payload = {
      display_name: 'Wissam',
      timezone: 'America/New_York',
      family: [{ name: 'Mom', email: 'mom@family.com' }],
      coworkers: [{ name: 'Jordan', email: 'jordan@company.com' }],
      brief_hour: 8,
      interests: ['travel'],
    };

    it('creates profile, contacts, default rules, and seed memories', async () => {
      dispatchBySql([
        ['SELECT onboarded_at FROM agent_profiles', { rows: [] }],
        ['WHERE agent_address', { rows: [] }],
        ['INSERT INTO agent_profiles', { rows: [profileRow] }],
        ['INSERT INTO memories', { rows: [{ id: 'm1' }] }],
      ]);

      const res = await request(app)
        .post('/profile/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.profile.agent_address).toBe('wissam@agent.local');

      const calls = mockQuery.mock.calls;
      const contactInserts = calls.filter(([sql]) => String(sql).includes('INSERT INTO contacts'));
      expect(contactInserts).toHaveLength(2);
      expect(contactInserts[0][1]).toEqual([USER_ID, 'Mom', 'mom@family.com']);
      expect(String(contactInserts[0][0])).toContain("'family'");
      expect(contactInserts[1][1]).toEqual([USER_ID, 'Jordan', 'jordan@company.com']);
      expect(String(contactInserts[1][0])).toContain("'coworker'");

      const ruleInserts = calls.filter(([sql]) => String(sql).includes('INSERT INTO invite_rules'));
      expect(ruleInserts).toHaveLength(3);

      const memoryInserts = calls.filter(([sql]) => String(sql).includes('INSERT INTO memories'));
      // brief-time preference + 1 interest
      expect(memoryInserts).toHaveLength(2);
    });

    it('derives the agent address from the user email local part', async () => {
      dispatchBySql([
        ['SELECT onboarded_at FROM agent_profiles', { rows: [] }],
        ['WHERE agent_address', { rows: [] }],
        ['INSERT INTO agent_profiles', { rows: [profileRow] }],
      ]);

      await request(app)
        .post('/profile/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      const insert = mockQuery.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO agent_profiles')
      )!;
      expect(insert[1][3]).toBe('wissam@agent.local');
    });

    it('returns 409 when onboarding was already completed', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ onboarded_at: '2026-01-01T00:00:00Z' }] });

      const res = await request(app)
        .post('/profile/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(409);
    });

    it('returns 422 for an invalid timezone', async () => {
      const res = await request(app)
        .post('/profile/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...payload, timezone: 'Not/AZone' });

      expect(res.status).toBe(422);
    });

    it('returns 422 for a bad contact email', async () => {
      const res = await request(app)
        .post('/profile/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...payload, family: [{ name: 'Mom', email: 'not-an-email' }] });

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /profile', () => {
    it('updates provided fields', async () => {
      dispatchBySql([
        ['SELECT user_id FROM agent_profiles', { rows: [{ user_id: USER_ID }] }],
        ['UPDATE agent_profiles', { rows: [{ ...profileRow, brief_hour: 7 }] }],
      ]);

      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ brief_hour: 7 });

      expect(res.status).toBe(200);
      expect(res.body.profile.brief_hour).toBe(7);
    });

    it('returns 404 when no profile exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ brief_hour: 7 });

      expect(res.status).toBe(404);
    });
  });
});
