import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { pool } from '../db/pool.js';

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const requireAdmin: RequestHandler = async (request, response, next) => {
  const token = request.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) { response.status(401).json({ error: { message: 'Please sign in again.' } }); return; }
  if (!pool) { response.status(503).json({ error: { message: 'Authentication temporarily unavailable.' } }); return; }
  const result = token ? await pool.query('SELECT s.id AS session_id,s.expires_at,u.id,u.first_name,u.last_name,u.email,u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true', [tokenHash(token)]) : null;
  const row = result?.rows[0];
  if (!row) { response.status(401).json({ error: { message: 'Please sign in again.' } }); return; }
  response.locals.sessionId = row.session_id;
  response.locals.expiresAt = row.expires_at;
  response.locals.user = { id: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email, username: row.username };
  next();
};
