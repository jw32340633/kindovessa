DROP INDEX IF EXISTS catalog_variants_sku_idx;

ALTER TABLE catalog_variants
  DROP COLUMN IF EXISTS sku;

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS leads integer NOT NULL DEFAULT 0 CHECK (leads >= 0);
