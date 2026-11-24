import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { PoolClient } from "pg";

import { pool } from "../db/pool.js";

import { requireAdmin } from "../middleware/require-admin.js";

import { cleanupAssets } from "../lib/asset-cleanup.js";
import { Category } from "../data/enum.js";

const money = z.string().regex(/^(?:|\d{1,7}(?:\.\d{1,2})?)$/);
const integer = z
  .string()
  .regex(/^(?:|\d{1,9})$/)
  .refine((value) => !value || Number(value) <= 2147483647);

const optionTypes = [
  "image-swatch",
  "color-swatch",
  "size",
  "length",
  "pack-count",
] as const;

const allowedDetails = [
  "shortDescription",
  "description",
  "highlights",
  "usage",
  "care",
  "safety",
  "seoTitle",
  "seoDescription",
];

const optionImage = z
  .object({
    assetId: z.uuid(),
    url: z
      .url()
      .max(2000)
      .refine((value) => new URL(value).protocol === "https:"),
    name: z.string().max(250),
  })
  .strict();
const detailImageSections = ["usage", "care", "safety"] as const;
const detailImages = z
  .object({
    usage: optionImage.nullable(),
    care: optionImage.nullable(),
    safety: optionImage.nullable(),
  })
  .strict();
const variant = z
  .object({
    type: z.enum(optionTypes),
    title: z.string().trim().min(1).max(100),
    priceMode: z.enum(["same", "custom"]),
    price: money,
    colorHex: z.union([z.literal(""), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]),
    image: optionImage.nullable(),
  })
  .strict();
export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    brand: z.string().trim().max(100),
    category: z.enum(Category),
    variants: z.array(variant).max(50),
    images: z
      .array(
        z
          .object({
            assetId: z.uuid(),
            url: z
              .url()
              .max(2000)
              .refine((value) => new URL(value).protocol === "https:"),
            alt: z.string().trim().min(1).max(250),
            name: z.string().max(250),
          })
          .strict(),
      )
      .max(8),
    detailImages,
    price: money,
    rating: z.string().regex(/^(?:|[0-4](?:\.\d)?|5(?:\.0)?)$/),
    reviewCount: integer,
    soldCount: integer,
    details: z
      .record(z.string(), z.string().max(10000))
      .refine((value) =>
        Object.keys(value).every((key) => allowedDetails.includes(key)),
      ),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const issue = (field: string, message: string) =>
      context.addIssue({ code: "custom", path: [field], message });
    if (new Set(value.variants.map((item) => item.type)).size > 1)
      issue("variants", "Use one option type per product.");
    value.variants.forEach((item, index) => {
      if (item.type === "color-swatch" && !item.colorHex)
        context.addIssue({
          code: "custom",
          path: ["variants", index, "colorHex"],
          message: "Color swatches need a hex color.",
        });
      if (item.type !== "color-swatch" && item.colorHex)
        context.addIssue({
          code: "custom",
          path: ["variants", index, "colorHex"],
          message: "A color is only used for color swatches.",
        });
      if (item.type === "image-swatch" && !item.image)
        context.addIssue({
          code: "custom",
          path: ["variants", index, "image"],
          message: "Image swatches need an image.",
        });
      if (item.type !== "image-swatch" && item.image)
        context.addIssue({
          code: "custom",
          path: ["variants", index, "image"],
          message: "Images are only used for image swatches.",
        });
      if (item.priceMode === "custom" && item.price === "")
        context.addIssue({
          code: "custom",
          path: ["variants", index, "price"],
          message: "Enter a custom price.",
        });
      if (item.priceMode === "same" && item.price !== "")
        context.addIssue({
          code: "custom",
          path: ["variants", index, "price"],
          message: "Clear the price when it matches the product price.",
        });
    });
    if (
      !value.images.length ||
      value.price === "" ||
      !value.details.description?.trim()
    )
      issue(
        "product",
        "Products require an image, product price, and a description.",
      );
    if (value.details.seoTitle && value.details.seoTitle.length > 70)
      issue("details", "SEO title must be at most 70 characters.");
    if (
      value.details.seoDescription &&
      value.details.seoDescription.length > 160
    )
      issue("details", "SEO description must be at most 160 characters.");
  });

export const cents = (value: string) => {
  if (!value) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};

const selectProduct = `SELECT p.*, count(*) OVER () AS total_count,COALESCE((SELECT jsonb_agg(jsonb_build_object('type',v.option_type,'title',v.title,'priceMode',CASE WHEN v.price_cents IS NULL THEN 'same' ELSE 'custom' END,'price',CASE WHEN v.price_cents IS NULL THEN '' ELSE (v.price_cents::numeric/100)::numeric(12,2)::text END,'colorHex',COALESCE(v.color_hex,''),'image',CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('assetId',a.id,'url',a.url,'name','') END) ORDER BY v.sort_order) FROM catalog_variants v LEFT JOIN catalog_assets a ON a.id=v.image_asset_id WHERE v.product_id=p.id),'[]') AS variants,COALESCE((SELECT jsonb_agg(jsonb_build_object('assetId',i.asset_id,'url',i.url,'alt',i.alt,'name',i.name) ORDER BY i.sort_order) FROM catalog_images i WHERE i.product_id=p.id),'[]') AS images,COALESCE((SELECT jsonb_object_agg(di.section,jsonb_build_object('assetId',a.id,'url',a.url,'name','')) FROM catalog_detail_images di JOIN catalog_assets a ON a.id=di.asset_id WHERE di.product_id=p.id),'{}') AS detail_images FROM catalog_products p`;

function serialize(row: Record<string, unknown>) {
  const detailImages = row.detail_images as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    category: row.category,
    variants: row.variants,
    images: row.images,
    detailImages: {
      usage: detailImages.usage ?? null,
      care: detailImages.care ?? null,
      safety: detailImages.safety ?? null,
    },
    price:
      row.price_cents === null
        ? ""
        : (Number(row.price_cents) / 100).toFixed(2),
    rating: row.rating === null ? "" : String(row.rating),
    reviewCount: row.review_count === null ? "" : String(row.review_count),
    soldCount: row.sold_count === null ? "" : String(row.sold_count),
    leads: Number(row.leads),
    featuredProduct: Boolean(row.featured_product),
    discountPrice: (Number(row.discount_price_cents ?? 0) / 100).toFixed(2),
    discountBadge: String(row.discount_badge ?? "none"),
    details: row.details,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function children(
  client: PoolClient,
  id: string,
  data: z.infer<typeof productSchema>,
  ownerId: string,
) {
  const sectionImages = Object.values(data.detailImages).flatMap((image) =>
    image ? [image] : [],
  );
  const assetIds = [
    ...data.images.map((image) => image.assetId),
    ...data.variants.flatMap((item) =>
      item.image ? [item.image.assetId] : [],
    ),
    ...sectionImages.map((image) => image.assetId),
  ];
  if (new Set(assetIds).size !== assetIds.length) throw new InvalidAssetError();
  for (const assetInput of [
    ...data.images,
    ...data.variants.flatMap((item) => (item.image ? [item.image] : [])),
    ...sectionImages,
  ]) {
    const asset = (
      await client.query(
        "SELECT id FROM catalog_assets WHERE id=$1 AND url=$2 AND (product_id=$3 OR (product_id IS NULL AND owner_id=$4 AND expires_at>now())) FOR UPDATE",
        [assetInput.assetId, assetInput.url, id, ownerId],
      )
    ).rows[0];
    if (!asset) throw new InvalidAssetError();
  }
  await client.query(
    "UPDATE catalog_assets SET product_id=NULL,expires_at=now() WHERE product_id=$1 AND NOT(id=ANY($2::uuid[]))",
    [id, assetIds],
  );
  await client.query("DELETE FROM catalog_variants WHERE product_id=$1", [id]);
  await client.query("DELETE FROM catalog_images WHERE product_id=$1", [id]);
  await client.query("DELETE FROM catalog_detail_images WHERE product_id=$1", [
    id,
  ]);
  await client.query(
    "UPDATE catalog_assets SET product_id=$1,expires_at=NULL WHERE id=ANY($2::uuid[])",
    [id, assetIds],
  );
  for (const [index, item] of data.variants.entries())
    await client.query(
      "INSERT INTO catalog_variants(id,product_id,option_type,title,color_hex,image_asset_id,price_cents,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        randomUUID(),
        id,
        item.type,
        item.title,
        item.colorHex || null,
        item.image?.assetId ?? null,
        item.priceMode === "custom" ? cents(item.price) : null,
        index,
      ],
    );
  for (const [index, image] of data.images.entries())
    await client.query(
      "INSERT INTO catalog_images(id,product_id,url,alt,name,sort_order,asset_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        randomUUID(),
        id,
        image.url,
        image.alt,
        image.name,
        index,
        image.assetId,
      ],
    );
  for (const section of detailImageSections) {
    const image = data.detailImages[section];
    if (image)
      await client.query(
        "INSERT INTO catalog_detail_images(product_id,section,asset_id) VALUES($1,$2,$3)",
        [id, section, image.assetId],
      );
  }
}

class InvalidAssetError extends Error {}
export const catalogProductsRouter = Router();
catalogProductsRouter.use(requireAdmin);

catalogProductsRouter.get("/", async (request, response) => {
  const parsed = z
    .object({
      q: z.string().max(150).optional(),
      category: z.enum(Category).optional(),
    })
    .strict()
    .safeParse(request.query);
  if (!parsed.success) {
    response
      .status(400)
      .json({ error: { message: "Invalid catalog filters." } });
    return;
  }
  const { q = "", category = null } = parsed.data;
  const result = await pool!.query(
    `${selectProduct} WHERE ($1='' OR strpos(lower(p.name || ' ' || p.brand),lower($1))>0) AND ($2::text IS NULL OR p.category=$2) ORDER BY p.created_at DESC, p.id LIMIT 501`,
    [q, category],
  );
  response.json({
    products: result.rows.slice(0, 500).map(serialize),
    total: Number(result.rows[0]?.total_count ?? 0),
    truncated: result.rows.length > 500,
  });
});

catalogProductsRouter.get("/:id", async (request, response) => {
  if (!z.uuid().safeParse(request.params.id).success) {
    response.status(400).json({ error: { message: "Invalid product ID." } });
    return;
  }
  const result = await pool!.query(`${selectProduct} WHERE p.id=$1`, [
    request.params.id,
  ]);
  if (!result.rowCount) {
    response.status(404).json({ error: { message: "Product not found." } });
    return;
  }
  response.json({ product: serialize(result.rows[0]) });
});

for (const method of ["post", "put"] as const)
  catalogProductsRouter[method](
    method === "post" ? "/" : "/:id",
    async (request, response) => {
      const parsed = productSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({
          error: {
            message: parsed.error.issues[0]?.message ?? "Invalid product.",
            fields: z.flattenError(parsed.error).fieldErrors,
          },
        });
        return;
      }
      const update = method === "put";
      const productId = "id" in request.params ? request.params.id : undefined;
      if (
        update &&
        (!z.uuid().safeParse(productId).success || !parsed.data.version)
      ) {
        response.status(400).json({
          error: { message: "A valid ID and product version are required." },
        });
        return;
      }
      const id = update ? String(productId) : randomUUID();
      const data = parsed.data;
      const priceCents = cents(data.price);
      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        if (update) {
          const existing = (
            await client.query(
              "SELECT version, discount_price_cents FROM catalog_products WHERE id=$1 FOR UPDATE",
              [id],
            )
          ).rows[0];
          if (!existing || existing.version !== data.version) {
            await client.query("ROLLBACK");
            response.status(existing ? 409 : 404).json({
              error: {
                message: existing
                  ? "This product changed in another session. Close the editor and reload before editing."
                  : "Product not found.",
              },
            });
            return;
          }
          if (existing.discount_price_cents > 0 &&
              (priceCents === null || priceCents <= existing.discount_price_cents)) {
            await client.query("ROLLBACK");
            response.status(409).json({
              error: { message: "Adjust or remove the sale price in Sale Management before changing the product price." },
            });
            return;
          }
        }
        const values = [
          data.name,
          data.slug,
          data.brand,
          data.category,
          JSON.stringify(data.details),
          priceCents,
          data.rating === "" ? null : Number(data.rating),
          data.reviewCount === "" ? null : Number(data.reviewCount),
          data.soldCount === "" ? null : Number(data.soldCount),
          id,
        ];
        if (update)
          await client.query(
            "UPDATE catalog_products SET name=$1,slug=$2,brand=$3,category=$4,details=$5,price_cents=$6,rating=$7,review_count=$8,sold_count=$9,version=version+1,updated_at=now() WHERE id=$10",
            values,
          );
        else
          await client.query(
            "INSERT INTO catalog_products(name,slug,brand,category,details,price_cents,rating,review_count,sold_count,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
            values,
          );
        await children(client, id, data, response.locals.user.id);
        const result = await client.query(`${selectProduct} WHERE p.id=$1`, [
          id,
        ]);
        await client.query("COMMIT");
        void cleanupAssets();
        response
          .status(update ? 200 : 201)
          .json({ product: serialize(result.rows[0]) });
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidAssetError) {
          response.status(400).json({
            error: {
              message:
                "An image is unavailable or already belongs to another product. Upload it again.",
            },
          });
          return;
        }
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "23505"
        ) {
          response
            .status(409)
            .json({ error: { message: "The URL slug is already in use." } });
          return;
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );

const bulkDeleteSchema = z
  .object({
    products: z
      .array(
        z
          .object({ id: z.uuid(), version: z.number().int().positive() })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.products.map((product) => product.id)).size !==
      value.products.length
    )
      context.addIssue({
        code: "custom",
        path: ["products"],
        message: "Products must be unique.",
      });
  });

catalogProductsRouter.delete("/bulk", async (request, response) => {
  const parsed = bulkDeleteSchema.safeParse(request.body);
  if (!parsed.success) {
    response
      .status(400)
      .json({ error: { message: "Select between 1 and 100 valid products." } });
    return;
  }
  const ids = parsed.data.products.map((product) => product.id);
  const versions = new Map(
    parsed.data.products.map((product) => [product.id, product.version]),
  );
  const client = await pool!.connect();
  let result;
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; version: number }>(
      "SELECT id,version FROM catalog_products WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
      [ids],
    );
    if (
      existing.rows.length !== ids.length ||
      existing.rows.some(
        (product) => versions.get(product.id) !== product.version,
      )
    ) {
      await client.query("ROLLBACK");
      response.status(409).json({
        error: {
          message:
            "One or more products changed or were deleted. Refresh the list and try again.",
        },
      });
      return;
    }
    await client.query(
      "UPDATE catalog_assets SET product_id=NULL,expires_at=now() WHERE product_id=ANY($1::uuid[])",
      [ids],
    );
    result = await client.query<{ id: string }>(
      "DELETE FROM catalog_products WHERE id=ANY($1::uuid[]) RETURNING id",
      [ids],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  void cleanupAssets();
  response.json({ deletedIds: result.rows.map((product) => product.id) });
});

catalogProductsRouter.delete("/:id", async (request, response) => {
  const parsed = z
    .object({ version: z.number().int().positive() })
    .strict()
    .safeParse(request.body);
  if (!z.uuid().safeParse(request.params.id).success || !parsed.success) {
    response.status(400).json({
      error: { message: "A valid ID and product version are required." },
    });
    return;
  }
  const client = await pool!.connect();
  let result;
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id FROM catalog_products WHERE id=$1 AND version=$2 FOR UPDATE",
      [request.params.id, parsed.data.version],
    );
    if (existing.rowCount)
      await client.query(
        "UPDATE catalog_assets SET product_id=NULL,expires_at=now() WHERE product_id=$1",
        [request.params.id],
      );
    result = await client.query(
      "DELETE FROM catalog_products WHERE id=$1 AND version=$2 RETURNING id",
      [request.params.id, parsed.data.version],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  void cleanupAssets();
  if (!result.rowCount) {
    response.status(409).json({
      error: {
        message:
          "Product was changed or deleted. Refresh the list before deleting.",
      },
    });
    return;
  }
  response.status(204).end();
});
