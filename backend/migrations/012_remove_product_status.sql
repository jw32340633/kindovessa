DROP INDEX IF EXISTS catalog_products_filter_idx;
ALTER TABLE catalog_products DROP COLUMN IF EXISTS status;
CREATE INDEX IF NOT EXISTS catalog_products_category_idx ON catalog_products(category);
