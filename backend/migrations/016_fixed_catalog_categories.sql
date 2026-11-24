-- Preserve category assignments and the selected collection before removing
-- editable category records. The constraints abort the migration if a custom
-- category is still in use.
ALTER TABLE catalog_products
  ADD CONSTRAINT catalog_products_category_check CHECK (category IN (
    'personal-care', 'bath-mobility', 'daily-living-aids', 'health-monitors', 'massagers-comfort'
  ));

ALTER TABLE storefront_settings
  ADD COLUMN collection_category text CHECK (collection_category IN (
    'personal-care', 'bath-mobility', 'daily-living-aids', 'health-monitors', 'massagers-comfort'
  ));

UPDATE storefront_settings
SET collection_category = (SELECT slug FROM catalog_categories WHERE is_collection_category)
WHERE id = 1;

ALTER TABLE catalog_products DROP CONSTRAINT catalog_products_category_fk;

UPDATE catalog_assets a SET expires_at = now()
FROM catalog_categories c
WHERE a.id = c.cover_asset_id AND a.product_id IS NULL;

DROP TABLE catalog_categories;
