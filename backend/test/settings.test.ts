import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/lib/password.js';
import { settingsSchema } from '../src/routes/settings.js';

const values = { firstName: 'Test', lastName: 'Administrator', username: 'test_admin', currentPassword: 'test-current-passphrase', password: '', confirmPassword: '' };
test('settings rejects weak passwords, mismatches and client-supplied identity', () => {
  assert.equal(settingsSchema.safeParse({ ...values, password: 'short', confirmPassword: 'short' }).success, false);
  assert.equal(settingsSchema.safeParse({ ...values, password: 'a-long-new-passphrase', confirmPassword: 'different' }).success, false);
  assert.equal(settingsSchema.safeParse({ ...values, id: 'someone-else' }).success, false);
  assert.equal(settingsSchema.safeParse(values).success, true);
});
test('settings requires an authenticated admin', async () => {
  await request(createApp()).post('/api/v1/auth/settings').send(values).expect(401);
});

for (const scenario of ['wrong-password', 'profile', 'credentials']) {
  test(`settings transaction: ${scenario}`, { skip: !pool }, async (context) => {
    const database = pool!;
    const statements: string[] = [];
    const user = { id: 'test-admin', first_name: 'Test', last_name: 'Administrator', username: 'test_admin', email: 'test@example.invalid', active: true, password_hash: await hashPassword(values.currentPassword) };
    context.mock.method(database, 'query', async () => ({ rows: [{ ...user, session_id: 'test-session', expires_at: new Date(Date.now() + 100000) }], rowCount: 1 }));
    const client = {
      query: async (sql: string) => { statements.push(sql); return { rows: sql.startsWith('SELECT *') || sql.startsWith('UPDATE admin_users SET first_name') ? [user] : [], rowCount: 1 }; },
      release: () => {},
    };
    context.mock.method(database, 'connect', async () => client);
    const payload = { ...values, ...(scenario === 'wrong-password' ? { currentPassword: 'wrong-password' } : scenario === 'credentials' ? { password: 'new-test-passphrase', confirmPassword: 'new-test-passphrase' } : {}) };
    const response = await request(createApp()).post('/api/v1/auth/settings').set('Authorization', `Bearer ${'a'.repeat(64)}`).send(payload).expect(scenario === 'wrong-password' ? 400 : 200);
    if (scenario === 'wrong-password') assert.equal(statements.some((sql) => sql.startsWith('UPDATE admin_users SET first_name')), false);
    else {
      assert.equal(response.body.requiresLogin, scenario === 'credentials');
      assert.equal(statements.some((sql) => sql.startsWith('DELETE FROM admin_sessions')), scenario === 'credentials');
    }
    assert.ok(statements.includes('COMMIT'));
  });
}
