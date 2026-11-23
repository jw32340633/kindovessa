CREATE TABLE catalog_detail_images (
  product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  section text NOT NULL CHECK(section IN ('usage','care','safety')),
  asset_id uuid NOT NULL REFERENCES catalog_assets(id) ON DELETE RESTRICT,
  PRIMARY KEY(product_id, section),
  UNIQUE(asset_id)
);
