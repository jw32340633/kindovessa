import { Router, raw } from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../middleware/require-admin.js";
import { pool } from "../db/pool.js";
import {
  supportedImage,
  uploadImage,
  uploadsConfigured,
} from "../lib/cloudinary.js";

export const uploadsRouter = Router();
uploadsRouter.use(requireAdmin);
uploadsRouter.use(
  rateLimit({
    windowMs: 60000,
    limit: 20,
    keyGenerator: (_request, response) => response.locals.user.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
uploadsRouter.post(
  "/",
  raw({ type: "application/octet-stream", limit: "3mb", inflate: false }),
  async (request, response) => {
    if (!uploadsConfigured()) {
      response
        .status(503)
        .json({ error: { message: "Image storage is not configured." } });
      return;
    }
    if (!Buffer.isBuffer(request.body) || !supportedImage(request.body)) {
      response
        .status(415)
        .json({
          error: {
            message:
              "Choose a valid JPEG, PNG, WebP, or AVIF image (up to 3 MB).",
          },
        });
      return;
    }
    // Reserve before contacting storage so even an interrupted upload is eventually cleaned up.
    const id = randomUUID();
    const publicId = `kindovessa/products/${id}`;
    const pending = await pool!.query(
      "SELECT count(*)::int AS count FROM catalog_assets WHERE owner_id=$1 AND product_id IS NULL AND expires_at IS NOT NULL",
      [response.locals.user.id],
    );
    if (pending.rows[0].count >= 40) {
      response
        .status(429)
        .json({
          error: {
            message: "Too many unused uploads. Try again after cleanup.",
          },
        });
      return;
    }
    await pool!.query(
      "INSERT INTO catalog_assets(id,owner_id,public_id) VALUES($1,$2,$3)",
      [id, response.locals.user.id, publicId],
    );
    try {
      const url = await uploadImage(publicId, request.body);
      await pool!.query("UPDATE catalog_assets SET url=$1 WHERE id=$2", [
        url,
        id,
      ]);
      response
        .status(201)
        .json({ image: { assetId: id, url, alt: "", name: "" } });
    } catch {
      response
        .status(502)
        .json({
          error: {
            message: "Image upload failed. Choose a valid image or try again.",
          },
        });
    }
  },
);
