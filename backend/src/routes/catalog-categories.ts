import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { cleanupAssets } from "../lib/asset-cleanup.js";
import { requireAdmin } from "../middleware/require-admin.js";

export const catalogCategorySlug = z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const categoryForm = z.object({
  title: z.string().trim().min(1).max(120),
  coverAssetId: z.uuid(),
  version: z.number().int().positive().optional(),
}).strict();

const deleteForm = z.object({
  categories: z.array(z.object({ id: z.uuid(), version: z.number().int().positive() }).strict()).min(1).max(100),
}).strict();

const listCategories = `
  SELECT c.id, c.slug, c.title, a.url AS "coverUrl", c.cover_asset_id AS "coverAssetId",
         c.created_at AS "createdAt", c.version,
         (SELECT count(*)::int FROM catalog_products p WHERE p.category = c.slug) AS "productCount"
  FROM catalog_categories c
  JOIN catalog_assets a ON a.id = c.cover_asset_id`;

class CatalogCategoryError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export const catalogCategoriesRouter = Router();
catalogCategoriesRouter.use(requireAdmin);

catalogCategoriesRouter.get("/", async (_request, response) => {
  const result = await pool!.query(`${listCategories} ORDER BY c.created_at DESC, c.id`);
  response.json({ categories: result.rows });
});

for (const method of ["post", "put"] as const) {
  catalogCategoriesRouter[method](method === "post" ? "/" : "/:id", async (request, response) => {
    const parsed = categoryForm.safeParse(request.body);
    const id = "id" in request.params ? request.params.id : undefined;
    if (!parsed.success || (method === "put" && (!z.uuid().safeParse(id).success || !parsed.data.version))) {
      response.status(400).json({ error: { message: "Enter a title, upload a cover image, and reload before editing an existing category." } });
      return;
    }
    const { title, coverAssetId, version } = parsed.data;
    const slug = title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!catalogCategorySlug.safeParse(slug).success) {
      response.status(400).json({ error: { message: "Use at least one letter or number that can form a URL." } });
      return;
    }
    const client = await pool!.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT version FROM storefront_settings WHERE id = 1 FOR UPDATE");
      const { rows: [current] } = await client.query(
        "SELECT id, slug, title, version, is_collection_category, cover_asset_id FROM catalog_categories WHERE " +
          (method === "put" ? "id = $1" : "slug = $1") + " FOR UPDATE",
        [method === "put" ? id : slug],
      );
      if (method === "put" && (!current?.title || current.version !== version))
        throw new CatalogCategoryError(409, "This category changed or was removed. Refresh the table and try again.");
      if (method === "post" && current?.title)
        throw new CatalogCategoryError(409, "This category URL is already in use.");

      if (current?.cover_asset_id !== coverAssetId) {
        const claimed = await client.query(
          `UPDATE catalog_assets SET expires_at = NULL
           WHERE id = $1 AND owner_id = $2 AND product_id IS NULL AND expires_at > now()
             AND url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM catalog_categories WHERE cover_asset_id = $1)`,
          [coverAssetId, response.locals.user.id],
        );
        if (claimed.rowCount !== 1)
          throw new CatalogCategoryError(400, "Upload a new cover image. The selected upload is no longer available.");
      }
      let categoryId = current?.id;
      if (current) {
        // Category edits update product versions so an open editor cannot save a stale category.
        if (current.slug !== slug) {
          await client.query("UPDATE catalog_products SET version = version + 1, updated_at = now() WHERE category = $1", [current.slug]);
          if (current.is_collection_category) {
            await client.query("UPDATE storefront_settings SET version = version + 1, updated_at = now() WHERE id = 1");
          }
        }
        await client.query(
          "UPDATE catalog_categories SET title = $1, slug = $2, cover_asset_id = $3, created_at = COALESCE(created_at, now()), version = version + 1 WHERE id = $4",
          [title, slug, coverAssetId, categoryId],
        );
        if (current.cover_asset_id && current.cover_asset_id !== coverAssetId) {
          await client.query("UPDATE catalog_assets SET expires_at = now() WHERE id = $1", [current.cover_asset_id]);
        }
      } else {
        const inserted = await client.query(
          "INSERT INTO catalog_categories (title, slug, cover_asset_id, created_at) VALUES ($1, $2, $3, now()) RETURNING id",
          [title, slug, coverAssetId],
        );
        categoryId = inserted.rows[0].id;
      }
      const result = await client.query(`${listCategories} WHERE c.id = $1`, [categoryId]);
      await client.query("COMMIT");
      void cleanupAssets();
      response.status(method === "post" ? 201 : 200).json({ category: result.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof CatalogCategoryError) response.status(error.status).json({ error: { message: error.message } });
      else if (error && typeof error === "object" && "code" in error && error.code === "23505")
        response.status(409).json({ error: { message: "This category URL or cover image is already in use." } });
      else throw error;
    } finally {
      client.release();
    }
  });
}

catalogCategoriesRouter.delete("/bulk", async (request, response) => {
  const parsed = deleteForm.safeParse(request.body);
  if (!parsed.success || new Set(parsed.data.categories.map(({ id }) => id.toLowerCase())).size !== parsed.data.categories.length) {
    response.status(400).json({ error: { message: "Select between 1 and 100 distinct categories." } });
    return;
  }
  const targets = parsed.data.categories;
  const ids = targets.map(({ id }) => id.toLowerCase());
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT version FROM storefront_settings WHERE id = 1 FOR UPDATE");
    const { rows } = await client.query(
      "SELECT id, slug, version, is_collection_category, cover_asset_id FROM catalog_categories WHERE id = ANY($1::uuid[]) AND title IS NOT NULL ORDER BY id FOR UPDATE",
      [ids],
    );
    const versions = new Map(targets.map(({ id, version }) => [id.toLowerCase(), version]));
    if (rows.length !== ids.length || rows.some((row) => versions.get(row.id) !== row.version))
      throw new CatalogCategoryError(409, "A selected category changed or was removed. Refresh the table and try again.");
    if (rows.some((row) => row.is_collection_category))
      throw new CatalogCategoryError(409, "Remove the collection category in Merchandising before deleting it.");
    const linked = await client.query("SELECT 1 FROM catalog_products WHERE category = ANY($1::text[]) LIMIT 1", [rows.map((row) => row.slug)]);
    if (linked.rowCount)
      throw new CatalogCategoryError(409, "Move the products to another category before deleting their current category.");
    await client.query("DELETE FROM catalog_categories WHERE id = ANY($1::uuid[])", [ids]);
    await client.query("UPDATE catalog_assets SET expires_at = now() WHERE id = ANY($1::uuid[])", [rows.map((row) => row.cover_asset_id)]);
    await client.query("COMMIT");
    void cleanupAssets();
    response.sendStatus(204);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof CatalogCategoryError) response.status(error.status).json({ error: { message: error.message } });
    else throw error;
  } finally {
    client.release();
  }
});
