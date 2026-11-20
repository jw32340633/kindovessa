import { readFile } from 'node:fs/promises';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool.js';

if (!pool) throw new Error('DATABASE_URL is required');
let client: PoolClient | undefined;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(46209812)");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of ['001_admin_auth.sql', '002_admin_username.sql', '003_repair_admin_username.sql']) {
  if (!(await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) {
    await client.query(await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8'));
    await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
  }
  }
  await client.query('COMMIT');
  console.log('Auth migration applied.');
} catch { if (client) await client.query('ROLLBACK'); console.error('Migration failed; check database connectivity. No credentials were logged.'); process.exitCode = 1; }
finally { client?.release(); await pool.end(); }
