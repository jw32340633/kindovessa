import { Router } from "express";
import { z } from "zod";

import { pool } from "../db/pool.js";

import { categories, cents } from "./products.js";

import { requireAdmin } from "../middleware/require-admin.js";

const badgeTypes = [
  "none",
  "percent-off",
  "save-amount",
  "now-price",
  "flat-percent-off",
] as const;

const visibilitySchema = z
  .object({
    version: z.number().int().positive(),
    collectionCategory: z.enum(categories).nullable(),
    featuredProductIds: z.array(z.uuid()).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.featuredProductIds).size !== value.featuredProductIds.length
    )
      context.addIssue({
        code: "custom",
        path: ["featuredProductIds"],
        message: "A product can only be selected once.",
      });
  });

const discountSchema = z
  .object({
    version: z.number().int().positive(),
    discountPrice: z
      .string()
      .regex(
        /^(?:0|[1-9]\d{0,6}(?:\.\d{1,2})?)$/,
        "Enter a valid USD sale price.",
      ),
    discountBadge: z.enum(badgeTypes),
  })
  .strict();

function salesProduct(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    brand: String(row.brand ?? ""),
    category: String(row.category),
    price:
      row.price_cents === null
        ? ""
        : (Number(row.price_cents) / 100).toFixed(2),
    featuredProduct: Boolean(row.featured_product),
    discountPrice: (Number(row.discount_price_cents ?? 0) / 100).toFixed(2),
    discountBadge: String(row.discount_badge ?? "none"),
    version: Number(row.version),
  };
}

export const salesRouter = Router();
salesRouter.use(requireAdmin);

salesRouter.get("/", async (_request, response, next) => {
  if (!pool) {
    response
      .status(503)
      .json({ error: { message: "Database is unavailable." } });
    return;
  }
  try {
    const [products, storefront] = await Promise.all([
      pool.query(
        `SELECT id, name, brand, category, price_cents, featured_product, discount_price_cents, discount_badge, version FROM catalog_products ORDER BY name ASC LIMIT 501`,
      ),
      pool.query(
        "SELECT collection_category, version FROM storefront_settings WHERE id = 1",
      ),
    ]);
    const setting = storefront.rows[0];
    response.json({
      products: products.rows.slice(0, 500).map(salesProduct),
      truncated: products.rows.length > 500,
      storefront: {
        collectionCategory: setting?.collection_category ?? null,
        version: Number(setting?.version ?? 1),
      },
    });
  } catch (error) {
    next(error);
  }
});

salesRouter.put("/visibility", async (request, response, next) => {
  const parsed = visibilitySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        message:
          parsed.error.issues[0]?.message ?? "Invalid storefront settings.",
      },
    });
    return;
  }
  if (!pool) {
    response
      .status(503)
      .json({ error: { message: "Database is unavailable." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO storefront_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING",
    );
    const locked = await client.query(
      "SELECT version FROM storefront_settings WHERE id = 1 FOR UPDATE",
    );
    if (Number(locked.rows[0]?.version) !== parsed.data.version) {
      await client.query("ROLLBACK");
      response.status(409).json({
        error: {
          message: "Storefront settings changed. Refresh and try again.",
        },
      });
      return;
    }
    if (parsed.data.featuredProductIds.length) {
      const known = await client.query(
        "SELECT id FROM catalog_products WHERE id = ANY($1::uuid[])",
        [parsed.data.featuredProductIds],
      );
      if (known.rowCount !== parsed.data.featuredProductIds.length) {
        await client.query("ROLLBACK");
        response.status(400).json({
          error: {
            message: "One or more selected products no longer exist.",
          },
        });
        return;
      }
    }
    await client.query(
      "UPDATE catalog_products SET featured_product = (id = ANY($1::uuid[])), version = version + 1, updated_at = now() WHERE featured_product IS DISTINCT FROM (id = ANY($1::uuid[]))",
      [parsed.data.featuredProductIds],
    );
    const updated = await client.query(
      "UPDATE storefront_settings SET collection_category = $1, version = version + 1, updated_at = now() WHERE id = 1 RETURNING collection_category, version",
      [parsed.data.collectionCategory],
    );
    await client.query("COMMIT");
    response.json({
      storefront: {
        collectionCategory: updated.rows[0].collection_category,
        version: Number(updated.rows[0].version),
      },
      featuredProductIds: parsed.data.featuredProductIds,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

salesRouter.put("/:id", async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  const parsed = discountSchema.safeParse(request.body);
  if (!id.success || !parsed.success) {
    response.status(400).json({
      error: {
        message: parsed.success
          ? "Invalid product id."
          : (parsed.error.issues[0]?.message ?? "Invalid sale details."),
      },
    });
    return;
  }
  if (!pool) {
    response
      .status(503)
      .json({ error: { message: "Database is unavailable." } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT id, version, price_cents FROM catalog_products WHERE id = $1 FOR UPDATE",
      [id.data],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      response.status(404).json({ error: { message: "Product not found." } });
      return;
    }
    if (Number(current.rows[0].version) !== parsed.data.version) {
      await client.query("ROLLBACK");
      response.status(409).json({
        error: { message: "Product changed. Refresh and try again." },
      });
      return;
    }
    const discountCents = cents(parsed.data.discountPrice) ?? 0;
    const baseCents =
      current.rows[0].price_cents === null
        ? null
        : Number(current.rows[0].price_cents);
    if (
      discountCents > 0 &&
      (baseCents === null || discountCents >= baseCents)
    ) {
      await client.query("ROLLBACK");
      response.status(400).json({
        error: {
          message: "Sale price must be lower than the product price.",
        },
      });
      return;
    }
    if (discountCents === 0 && parsed.data.discountBadge !== "none") {
      await client.query("ROLLBACK");
      response.status(400).json({
        error: { message: "Choose No badge when no sale price is set." },
      });
      return;
    }
    const updated = await client.query(
      "UPDATE catalog_products SET discount_price_cents = $1, discount_badge = $2, version = version + 1, updated_at = now() WHERE id = $3 RETURNING id, name, brand, category, price_cents, featured_product, discount_price_cents, discount_badge, version",
      [discountCents, parsed.data.discountBadge, id.data],
    );
    await client.query("COMMIT");
    response.json({ product: salesProduct(updated.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});
