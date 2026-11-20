import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

test('password hashes are salted and reject incorrect passwords', async () => {
  const first = await hashPassword('test-only-passphrase');
  const second = await hashPassword('test-only-passphrase');
  assert.notEqual(first, second);
  assert.ok(await verifyPassword('test-only-passphrase', first));
  assert.equal(await verifyPassword('incorrect', first), false);
});
test('auth validates input and rejects missing credentials', async () => {
  const app = createApp();
  await request(app).post('/api/v1/auth/login').send({ username: 'invalid username!', password: '' }).expect(400);
  await request(app).get('/api/v1/auth/me').expect(401);
  await request(app).post('/api/v1/auth/refresh').expect(401);
  await request(app).post('/api/v1/auth/logout').expect(401);
});
