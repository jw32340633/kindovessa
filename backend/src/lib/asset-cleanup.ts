import { pool } from "../db/pool.js";
import { destroyImage, uploadsConfigured } from "./cloudinary.js";
import { logger } from "./logger.js";

let running = false;
export async function cleanupAssets() {
  if (!pool || !uploadsConfigured() || running) return;
  running = true;
  try {
    for (let index = 0; index < 10; index++) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const asset = (
          await client.query(
            "SELECT id,public_id FROM catalog_assets WHERE expires_at<=now() AND product_id IS NULL ORDER BY expires_at LIMIT 1 FOR UPDATE SKIP LOCKED",
          )
        ).rows[0];
        if (!asset) {
          await client.query("COMMIT");
          break;
        }
        try {
          await destroyImage(asset.public_id);
          await client.query("DELETE FROM catalog_assets WHERE id=$1", [
            asset.id,
          ]);
        } catch {
          await client.query(
            "UPDATE catalog_assets SET expires_at=now()+interval '5 minutes' WHERE id=$1",
            [asset.id],
          );
          logger.warn(
            { assetId: asset.id },
            "Image cleanup deferred; will retry",
          );
        }
        await client.query("COMMIT");
      } catch {
        await client.query("ROLLBACK");
        throw new Error("Asset cleanup unavailable.");
      } finally {
        client.release();
      }
    }
  } catch {
    logger.warn("Asset cleanup temporarily unavailable; will retry");
  } finally {
    running = false;
  }
}
