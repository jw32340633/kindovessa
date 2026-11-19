import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('liveness, security headers and request IDs', async () => {
  const response = await request(createApp()).get('/health/live').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.ok(response.headers['x-request-id']);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
});
test('readiness reflects database availability and sanitizes failures', async () => {
  await request(createApp({ databaseCheck: async () => true })).get('/health/ready').expect(200);
  const response = await request(createApp({ databaseCheck: async () => { throw new Error('private credentials'); } })).get('/health/ready').expect(503);
  assert.deepEqual(response.body, { status: 'not_ready' });
});
test('rejects unapproved origins and allows configured preflight', async () => {
  await request(createApp()).get('/health/live').set('Origin', 'https://untrusted.example').expect(403);
  const response = await request(createApp()).options('/api/v1/example').set('Origin', 'http://localhost:3001').set('Access-Control-Request-Method', 'POST').expect(204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:3001');
});
test('returns consistent 404 and rejects malformed or oversized JSON', async () => {
  const app = createApp();
  const missing = await request(app).get('/api/v1/missing').expect(404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
  await request(app).post('/api/v1/missing').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/api/v1/missing').send({ value: 'a'.repeat(40000) }).expect(413);
});
test('limits API requests without blocking liveness', async () => {
  const app = createApp({ rateLimitMax: 2 });
  await request(app).get('/api/v1/missing').expect(404);
  await request(app).get('/api/v1/missing').expect(404);
  const response = await request(app).get('/api/v1/missing').expect(429);
  assert.equal(response.body.error.code, 'RATE_LIMITED');
  assert.ok(response.headers['retry-after']);
  await request(app).get('/health/live').expect(200);
});
