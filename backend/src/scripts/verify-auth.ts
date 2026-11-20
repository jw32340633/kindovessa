import { pool } from '../db/pool.js';
import { createApp } from '../app.js';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

// Explicit opt-in smoke check using the provisioned account; never logs tokens.
const password = process.env.ADMIN_PASSWORD;
if (!password || !pool) throw new Error('ADMIN_PASSWORD and DATABASE_URL are required');
const server = createServer(createApp());
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Listener unavailable');
const base = `http://127.0.0.1:${address.port}/api/v1/auth`;
let token: string | undefined;
try {
  const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password }) });
  assert.equal(login.status, 200);
  const data = await login.json() as { token: string; expiresAt: string; user: { firstName: string; lastName: string } };
  token = data.token;
  assert.equal(data.user.firstName, 'Admin');
  assert.equal(data.user.lastName, 'Adminstration');
  const ttl = new Date(data.expiresAt).getTime() - Date.now();
  assert.ok(ttl > 8 * 3600000 - 60000 && ttl <= 8 * 3600000);
  const authenticated = (path: string, value: string, method = 'GET') => fetch(`${base}/${path}`, { method, headers: { Authorization: `Bearer ${value}` } });
  assert.equal((await authenticated('me', token)).status, 200);
  const refresh = await authenticated('refresh', token, 'POST');
  assert.equal(refresh.status, 200);
  const rotated = await refresh.json() as { token: string; expiresAt: string };
  assert.equal(new Date(rotated.expiresAt).getTime(), new Date(data.expiresAt).getTime());
  assert.notEqual(rotated.token, token);
  assert.equal((await authenticated('me', token)).status, 401);
  token = rotated.token;
  assert.equal((await authenticated('me', token)).status, 200);
  assert.equal((await authenticated('logout', token, 'POST')).status, 204);
  assert.equal((await authenticated('me', token)).status, 401);
  token = undefined;
  console.log('Real database auth smoke check passed: login, profile, eight-hour expiry, rotation, old-token rejection, logout, and revocation.');
} catch { console.error('Auth smoke check failed; no passwords or tokens were logged.'); process.exitCode = 1; }
finally {
  if (token) {
    const { tokenHash } = await import('../middleware/require-admin.js');
    await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1', [tokenHash(token)]);
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}
