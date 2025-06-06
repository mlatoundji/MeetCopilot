/** @jest-environment node */
import request from 'supertest';
import app from '../../server/app.js';

describe('Sessions API Integration Tests', () => {
  describe('POST /api/sessions', () => {
    it('should return 400 when mode is missing', async () => {
      const res = await request(app).post('/api/sessions').send({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Mode is required' });
    });
  });

  describe('GET /api/sessions', () => {
    it('should return 500 when Supabase is not configured', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
}); 