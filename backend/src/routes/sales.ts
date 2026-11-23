import { Router } from "express";
import { z } from "zod";

import { pool } from "../db/pool.js";

import { cents } from "./products.js";
import { catalogCategorySlug } from "./catalog-categories.js";

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
    collectionCategory: catalogCategorySlug.nullable(),
    featuredProductIds: z.array(z.uuid().transform((id) => id.toLowerCase())).max(500),
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
        /^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/,
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
    isFeaturedProduct: Boolean(row.featured_product),
    discountPrice: (Number(row.discount_price_cents ?? 0) / 100).toFixed(2),
    discountBadge: String(row.discount_badge ?? "none"),
    isDiscountPrice: Boolean(row.is_discount_price),
    isSaleTag: Boolean(row.is_sale_tag),
    saleTag: String(row.sale_tag ?? ""),
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
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.brand, p.category, p.price_cents, p.featured_product,
              p.discount_price_cents, p.discount_badge, p.is_discount_price, p.is_sale_tag,
              p.sale_tag, p.version, s.version AS storefront_version, c.slug AS collection_category,
              (SELECT COALESCE(json_agg(json_build_object('slug', slug, 'title', title) ORDER BY title), '[]'::json)
               FROM catalog_categories WHERE title IS NOT NULL) AS categories
       FROM storefront_settings s
       LEFT JOIN catalog_categories c ON c.is_collection_category
       LEFT JOIN catalog_products p ON true
       WHERE s.id = 1
       ORDER BY p.name, p.id`,
    );
    const setting = rows[0];
    response.json({
      products: rows.filter((row) => row.id !== null).map(salesProduct),
      categories: setting?.categories ?? [],
      storefront: {
        collectionCategory: setting?.collection_category ?? null,
        version: Number(setting?.storefront_version ?? 1),
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
      "SELECT version, (SELECT slug FROM catalog_categories WHERE is_collection_category) AS collection_category FROM storefront_settings WHERE id = 1 FOR UPDATE",
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
    const currentCategory = locked.rows[0].collection_category;
    if (currentCategory && parsed.data.collectionCategory && currentCategory !== parsed.data.collectionCategory) {
      await client.query("ROLLBACK");
      response.status(409).json({
        error: { message: "Remove the current collection category before selecting a new one." },
      });
      return;
    }
    const selected = new Set(parsed.data.featuredProductIds);
    const known = await client.query(
      "SELECT id FROM catalog_products WHERE featured_product OR id = ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE",
      [parsed.data.featuredProductIds],
    );
    if (known.rows.filter((row) => selected.has(row.id)).length !== selected.size) {
      await client.query("ROLLBACK");
      response.status(409).json({
        error: { message: "One or more selected products no longer exist. Reload saved settings." },
      });
      return;
    }
    await client.query(
      "UPDATE catalog_products SET featured_product = (id = ANY($1::uuid[])), version = version + 1, updated_at = now() WHERE featured_product IS DISTINCT FROM (id = ANY($1::uuid[]))",
      [parsed.data.featuredProductIds],
    );
    if (currentCategory !== parsed.data.collectionCategory) {
      const category = await client.query(
        "UPDATE catalog_categories SET is_collection_category = ($1::text IS NOT NULL) WHERE slug = $2 AND ($1::text IS NULL OR title IS NOT NULL)",
        [parsed.data.collectionCategory, parsed.data.collectionCategory ?? currentCategory],
      );
      if (category.rowCount !== 1) {
        await client.query("ROLLBACK");
        response.status(409).json({ error: { message: "The selected category is unavailable. Reload saved settings." } });
        return;
      }
    }
    const updated = await client.query(
      "UPDATE storefront_settings SET version = version + 1, updated_at = now() WHERE id = 1 RETURNING version",
    );
    await client.query("COMMIT");
    response.json({
      storefront: {
        collectionCategory: parsed.data.collectionCategory,
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
      `UPDATE catalog_products SET discount_price_cents = $1, discount_badge = $2,
       version = version + 1, updated_at = now() WHERE id = $3
       RETURNING id, name, brand, category, price_cents, featured_product, discount_price_cents,
                 discount_badge, is_discount_price, is_sale_tag, sale_tag, version`,
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
