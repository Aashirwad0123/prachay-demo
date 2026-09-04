// Own file so it can set low limits before app.js is required - Jest gives each test
// file its own module registry, so config/security.js re-reads these overrides fresh
// instead of picking up the higher limits set for the rest of the suite.
process.env.RATE_LIMIT_MAX = '3';
process.env.AUTH_RATE_LIMIT_MAX = '3';

const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');

beforeAll(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());

test('the auth limiter returns 429 with a generic message once the max attempts are exceeded', async () => {
  let last;
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    last = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'whatever1' });
  }
  expect(last.status).toBe(429);
  expect(last.body).toEqual({ message: 'Too many requests. Please try again later.' });
});

test('the global API limiter returns 429 once exceeded, independent of the auth limiter', async () => {
  let last;
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    last = await request(app).get('/api/health');
  }
  expect(last.status).toBe(429);
});
