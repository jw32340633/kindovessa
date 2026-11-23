import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool } from "../db/pool.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

export const settingsSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,40}$/),
    currentPassword: z.string().min(1).max(128),
    password: z.string().max(128).default(""),
    confirmPassword: z.string().max(128).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password && value.password.length < 12)
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Use at least 12 characters.",
      });
    if (value.password !== value.confirmPassword)
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords must match.",
      });
    if (value.password && value.password === value.currentPassword)
      context.addIssue({
        code: "custom",
        path: ["password"],
        message: "Choose a different password.",
      });
  });

export const settingsRouter = Router();
settingsRouter.post(
  "/",
  requireAdmin,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (_request, response) => response.locals.user.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: { message: "Too many settings attempts. Try again later." },
    },
  }),
  async (request, response) => {
    const parsed = settingsSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({
          error: {
            message: "Check the highlighted fields.",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        });
      return;
    }
    const data = parsed.data;
    const client = await pool!.connect();
    try {
      await client.query("BEGIN");
      const user = (
        await client.query(
          "SELECT * FROM admin_users WHERE id=$1 AND active=true FOR UPDATE",
          [response.locals.user.id],
        )
      ).rows[0];
      const session = await client.query(
        "SELECT 1 FROM admin_sessions WHERE id=$1 AND user_id=$2 AND expires_at>now()",
        [response.locals.sessionId, response.locals.user.id],
      );
      if (!user || !session.rowCount) {
        await client.query("ROLLBACK");
        response
          .status(401)
          .json({ error: { message: "Please sign in again." } });
        return;
      }
      if (
        user.locked_until &&
        new Date(user.locked_until).getTime() > Date.now()
      ) {
        await client.query("ROLLBACK");
        response
          .status(403)
          .json({
            error: { message: "Account temporarily locked. Try again later." },
          });
        return;
      }
      if (!(await verifyPassword(data.currentPassword, user.password_hash))) {
        await client.query(
          "UPDATE admin_users SET failed_attempts=CASE WHEN locked_until<=now() THEN 1 ELSE failed_attempts+1 END,locked_until=CASE WHEN failed_attempts>=4 AND (locked_until IS NULL OR locked_until<=now()) THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1",
          [user.id],
        );
        await client.query("COMMIT");
        response
          .status(400)
          .json({
            error: {
              message: "Current password is incorrect.",
              fields: { currentPassword: ["Current password is incorrect."] },
            },
          });
        return;
      }
      const credentialsChanged =
        user.username !== data.username || !!data.password;
      const result = await client.query(
        "UPDATE admin_users SET first_name=$1,last_name=$2,username=$3,password_hash=$4,failed_attempts=0,locked_until=NULL WHERE id=$5 RETURNING id,first_name,last_name,username,email",
        [
          data.firstName,
          data.lastName,
          data.username,
          data.password
            ? await hashPassword(data.password)
            : user.password_hash,
          user.id,
        ],
      );
      if (credentialsChanged)
        await client.query("DELETE FROM admin_sessions WHERE user_id=$1", [
          user.id,
        ]);
      await client.query("COMMIT");
      const updated = result.rows[0];
      response.json({
        user: {
          id: updated.id,
          firstName: updated.first_name,
          lastName: updated.last_name,
          username: updated.username,
          email: updated.email,
        },
        requiresLogin: credentialsChanged,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        response
          .status(409)
          .json({
            error: {
              message: "Username is unavailable.",
              fields: { username: ["Username is unavailable."] },
            },
          });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
  },
);
