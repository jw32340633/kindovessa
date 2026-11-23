ALTER TABLE catalog_products
  ALTER COLUMN details SET DEFAULT '{}';

UPDATE catalog_products
  SET details = details - 'specifications';

ALTER TABLE catalog_variants
  ADD COLUMN option_type text NOT NULL DEFAULT 'size' CHECK(option_type IN ('image-swatch','color-swatch','size','length','pack-count')),
  ADD COLUMN title varchar(100) NOT NULL DEFAULT '',
  ADD COLUMN color_hex varchar(7) CHECK(color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN image_asset_id uuid REFERENCES catalog_assets(id) ON DELETE SET NULL;

UPDATE catalog_variants
  SET title = COALESCE(NULLIF(options, ''), 'Option ' || (sort_order + 1)::text);

ALTER TABLE catalog_variants
  DROP COLUMN options,
  DROP COLUMN cost_cents,
  DROP COLUMN stock,
  DROP COLUMN weight_grams;

CREATE UNIQUE INDEX catalog_variants_image_asset_idx
  ON catalog_variants(image_asset_id) WHERE image_asset_id IS NOT NULL;
