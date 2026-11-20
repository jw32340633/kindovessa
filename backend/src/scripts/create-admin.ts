import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/password.js";

if (!pool) throw new Error("DATABASE_URL is required");
try {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8 || password.length > 128)
    throw new Error(
      "Set ADMIN_PASSWORD (8–128 characters) in the local environment.",
    );
  await pool.query(
    "INSERT INTO admin_users(id,first_name,last_name,email,username,password_hash) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING",
    [
      randomUUID(),
      "Admin",
      "Adminstration",
      "admin@kindovessa.com",
      "admin",
      await hashPassword(password),
    ],
  );
  console.log(
    "Admin provisioning completed; existing accounts were not changed.",
  );
} catch {
  console.error(
    "Admin provisioning failed. Check database migration and ADMIN_PASSWORD.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
