import request from 'supertest';
import app from '../../src/app.js';

describe('api versioning', () => {
  it('mounts protected resources under /api/v1', async () => {
    const response = await request(app).get('/api/v1/tasks').expect(401);
    expect(response.body.message).toBe('Not authorized');
  });
});
