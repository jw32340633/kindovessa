import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";

import { pool } from "../db/pool.js";

import { hashPassword, verifyPassword } from "../lib/password.js";

import { requireAdmin, tokenHash } from "../middleware/require-admin.js";

export const authRouter = Router();
const dummyHash = hashPassword(randomBytes(32).toString("hex"));

const loginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,40}$/),
    password: z.string().min(1).max(128),
  })
  .strict();

authRouter.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: { message: "Too many sign-in attempts. Try again later." },
    },
  }),
  async (request, response) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: { message: "Enter a valid username and password." } });
      return;
    }
    if (!pool) {
      response.status(503).json({
        error: { message: "Authentication temporarily unavailable." },
      });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const user = (
        await client.query(
          "SELECT * FROM admin_users WHERE username=$1 FOR UPDATE",
          [parsed.data.username],
        )
      ).rows[0];
      const valid = await verifyPassword(
        parsed.data.password,
        user?.password_hash ?? (await dummyHash),
      );
      if (
        !user ||
        !valid ||
        !user.active ||
        (user.locked_until &&
          new Date(user.locked_until).getTime() > Date.now())
      ) {
        if (user)
          await client.query(
            "UPDATE admin_users SET failed_attempts=CASE WHEN locked_until<=now() THEN 1 ELSE failed_attempts+1 END, locked_until=CASE WHEN failed_attempts>=4 AND (locked_until IS NULL OR locked_until<=now()) THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",
            [user.id],
          );
        await client.query("COMMIT");
        response.status(401).json({
          error: {
            message: "Invalid credentials or account temporarily locked.",
          },
        });
        return;
      }
      await client.query(
        "UPDATE admin_users SET failed_attempts=0,locked_until=NULL WHERE id=$1",
        [user.id],
      );
      await client.query(
        "DELETE FROM admin_sessions WHERE user_id=$1 AND expires_at<=now()",
        [user.id],
      );
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await client.query(
        "INSERT INTO admin_sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4)",
        [randomUUID(), user.id, tokenHash(token), expiresAt],
      );
      await client.query("COMMIT");
      response.json({
        token,
        expiresAt,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
);

authRouter.get("/me", requireAdmin, (_request, response) => {
  response.json({
    user: response.locals.user,
    expiresAt: response.locals.expiresAt,
  });
});

authRouter.post("/refresh", requireAdmin, async (request, response) => {
  const token = randomBytes(32).toString("hex");
  const previous = request.get("authorization")!.slice(7);
  const result = await pool!.query(
    "UPDATE admin_sessions SET token_hash=$1 WHERE id=$2 AND token_hash=$3 AND expires_at>now() RETURNING expires_at",
    [tokenHash(token), response.locals.sessionId, tokenHash(previous)],
  );
  if (!result.rowCount) {
    response.status(401).json({ error: { message: "Please sign in again." } });
    return;
  }
  response.json({
    token,
    expiresAt: result.rows[0].expires_at,
    user: response.locals.user,
  });
});

authRouter.post("/logout", requireAdmin, async (_request, response) => {
  await pool!.query("DELETE FROM admin_sessions WHERE id=$1", [
    response.locals.sessionId,
  ]);
  response.status(204).end();
});
