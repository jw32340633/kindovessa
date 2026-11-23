-- Keep existing links and the selected collection. Staff can complete those
-- categories by creating a category with the same generated slug.
DELETE FROM catalog_categories c
WHERE NOT c.is_collection_category
  AND NOT EXISTS (SELECT 1 FROM catalog_products p WHERE p.category = c.slug);

ALTER TABLE catalog_categories
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN title varchar(120),
  ADD COLUMN cover_asset_id uuid UNIQUE REFERENCES catalog_assets(id),
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN created_at timestamptz,
  ADD CONSTRAINT catalog_categories_complete CHECK (
    (title IS NULL AND cover_asset_id IS NULL AND created_at IS NULL)
    OR (title IS NOT NULL AND length(trim(title)) > 0 AND cover_asset_id IS NOT NULL AND created_at IS NOT NULL)
  );

ALTER TABLE catalog_products DROP CONSTRAINT catalog_products_category_check,
  DROP CONSTRAINT catalog_products_category_fk,
  ADD CONSTRAINT catalog_products_category_fk
    FOREIGN KEY (category) REFERENCES catalog_categories(slug) ON UPDATE CASCADE;
