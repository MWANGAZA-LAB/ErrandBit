/**
 * Auth Integration Tests
 * Test simple username/password authentication
 */

import request from 'supertest';
import express from 'express';
import authRouter from '../auth-simple.routes.js';
import { getPool } from '../../db.js';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Clean up test users
    const pool = getPool();
    if (pool) {
      await pool.query("DELETE FROM users WHERE username LIKE 'testuser%'");
    }
  });

  afterAll(async () => {
    // Clean up
    const pool = getPool();
    if (pool) {
      await pool.query("DELETE FROM users WHERE username LIKE 'testuser%'");
    }
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser1',
          password: 'password123',
          display_name: 'Test User 1',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe('testuser1');
      expect(response.body.user.display_name).toBe('Test User 1');

      testUserId = response.body.user.id;
      testToken = response.body.token;
    });

    it('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser1',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject short username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'ab',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser2',
          password: '12345',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser1',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser1');
    });

    it('should reject wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser1',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser1');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /auth/me', () => {
    it('should update display name', async () => {
      const response = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          display_name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.display_name).toBe('Updated Name');
    });

    it('should update password', async () => {
      const response = await request(app)
        .put('/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          password: 'newpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser1',
          password: 'newpassword123',
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject update without token', async () => {
      const response = await request(app)
        .put('/auth/me')
        .send({
          display_name: 'New Name',
        });

      expect(response.status).toBe(401);
    });
  });
});
