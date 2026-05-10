import request from 'supertest';
import app from '../../src/app.js';

describe('health', () => {
  it('returns service health', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
});
