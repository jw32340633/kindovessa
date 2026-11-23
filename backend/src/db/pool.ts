import pg from "pg";

import { env } from "../config/env.js";

import { logger } from "../lib/logger.js";

export const pool = env.DATABASE_URL
  ? new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
      query_timeout: 5000,
      application_name: "kindovessa-api",
    })
  : null;

pool?.on("error", () =>
  logger.error(
    { event: "database_pool_error" },
    "Idle database connection failed",
  ),
);

export async function checkDatabase(): Promise<boolean> {
  if (!pool) return false;
  await pool.query("SELECT 1");
  return true;
}
