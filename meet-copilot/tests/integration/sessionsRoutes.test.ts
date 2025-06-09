/** @jest-environment node */
/// <reference types="jest" />
import request from 'supertest';
import app from '../../server/app.js';

// Mock JWT for authentication (payload { sub: 'user1' })
const validToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c2VyMSJ9.';

describe('Sessions API Integration Tests', () => {
  describe('POST /api/sessions', () => {
    it('should return 400 when mode is missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Mode is required' });
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no auth token is provided', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('GET /api/sessions', () => {
    it('should return 500 when database credentials are invalid', async () => {
      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
}); 