import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the pool before importing the app
const mockQuery = vi.fn();
vi.mock('../../src/server/src/db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';

import { app } from '../../src/server/src/index';

describe('Auth Routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('POST /auth/register', () => {
    it('should register with valid data and return 201 + token', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // SELECT check for existing
        .mockResolvedValueOnce({
          rows: [{ id: 'user-uuid-1', email: 'test@example.com' }],
        }); // INSERT

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({ id: 'user-uuid-1', email: 'test@example.com' });
    });

    it('should return 409 for duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'dup@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 422 for short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return 200 + token', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-uuid-1', email: 'test@example.com', password: hash }],
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({ id: 'user-uuid-1', email: 'test@example.com' });
    });

    it('should return 401 for wrong password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-uuid-1', email: 'test@example.com', password: hash }],
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });
});
