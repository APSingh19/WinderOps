import request from 'supertest';
import app from '../../src/app.js';

describe('organization api', () => {
  it('protects the organization tree endpoint', async () => {
    const response = await request(app).get('/api/v1/organization/tree').expect(401);
    expect(response.body.message).toBe('Not authorized');
  });

  it('protects department deletion', async () => {
    const response = await request(app).delete('/api/v1/organization/departments/507f1f77bcf86cd799439011').expect(401);
    expect(response.body.message).toBe('Not authorized');
  });

  it('protects team archive deletion', async () => {
    const response = await request(app).delete('/api/v1/organization/teams/507f1f77bcf86cd799439011').expect(401);
    expect(response.body.message).toBe('Not authorized');
  });
});
