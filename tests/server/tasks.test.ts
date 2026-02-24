import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock the pool before importing the app
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
const OTHER_USER_ID = 'user-uuid-2';
const TASK_ID = 'task-uuid-1';

const sampleTask = {
  id: TASK_ID,
  user_id: USER_ID,
  title: 'Test task',
  description: null,
  status: 'todo',
  due_date: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('Task Routes', () => {
  let token: string;

  beforeEach(() => {
    mockQuery.mockReset();
    token = makeToken(USER_ID, 'test@example.com');
  });

  describe('POST /tasks', () => {
    it('should create a task and return 201', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleTask] });

      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test task' });

      expect(res.status).toBe(201);
      expect(res.body.task).toHaveProperty('id');
      expect(res.body.task.title).toBe('Test task');
    });

    it('should return 422 without title', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'no title' });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /tasks', () => {
    it('should list tasks and return 200', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleTask] });

      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return 200 for own task', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [sampleTask] });

      const res = await request(app)
        .get(`/tasks/${TASK_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.task.id).toBe(TASK_ID);
    });

    it('should return 403 for another user\'s task', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...sampleTask, user_id: OTHER_USER_ID }],
      });

      const res = await request(app)
        .get(`/tasks/${TASK_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent task', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/tasks/nonexistent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task status and return 200', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [sampleTask] }) // SELECT
        .mockResolvedValueOnce({
          rows: [{ ...sampleTask, status: 'in-progress' }],
        }); // UPDATE

      const res = await request(app)
        .patch(`/tasks/${TASK_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in-progress' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('in-progress');
    });

    it('should return 422 for invalid status', async () => {
      const res = await request(app)
        .patch(`/tasks/${TASK_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete task and return 204', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [sampleTask] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // DELETE

      const res = await request(app)
        .delete(`/tasks/${TASK_ID}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });
  });

  describe('Unauthorized requests', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/tasks');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
