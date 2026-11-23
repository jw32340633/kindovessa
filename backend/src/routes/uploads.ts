import { Router, raw } from "express";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../middleware/require-admin.js";
import { pool } from "../db/pool.js";
import { logger } from "../lib/logger.js";
import {
  ImageStorageError,
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
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      response.status(400).json({ error: { message: "The selected image is empty. Choose a file with image data." } });
      return;
    }
    if (!supportedImage(request.body)) {
      response
        .status(415)
        .json({
          error: {
            message:
              "The file contents do not match a supported image format. Export it as JPEG, PNG, WebP, or AVIF and try again.",
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
    let url: string;
    try {
      url = await uploadImage(publicId, request.body);
    } catch (cause) {
      const failure = cause instanceof ImageStorageError ? cause : new ImageStorageError("unavailable");
      logger.warn({ requestId: response.locals.requestId, kind: failure.kind, upstreamStatus: failure.upstreamStatus }, "Image storage upload failed");
      const errors = {
        unreadable: [422, "Image storage could not read this file. Open it in an image editor, export a fresh copy, and try again."],
        size: [413, "Image storage rejected the file size. Export a smaller copy and try again."],
        format: [415, "Image storage does not support this file format. Export it as JPEG, PNG, WebP, or AVIF."],
        configuration: [503, "Image storage could not authorize the upload. Contact an administrator."],
        unavailable: [502, "Image storage could not complete the upload. Try again shortly."],
      } as const;
      const [status, message] = errors[failure.kind];
      response.status(status).json({ error: { message } });
      return;
    }
    try {
      await pool!.query("UPDATE catalog_assets SET url=$1 WHERE id=$2", [url, id]);
    } catch {
      logger.warn({ requestId: response.locals.requestId }, "Uploaded image could not be registered");
      response.status(503).json({ error: { message: "The image uploaded, but the catalog could not save it. Try again shortly." } });
      return;
    }
    response.status(201).json({ image: { assetId: id, url, alt: "", name: "" } });
  },
);
