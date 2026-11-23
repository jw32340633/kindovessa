CREATE TABLE catalog_assets (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES admin_users(id),
 public_id text NOT NULL UNIQUE,
 url text,
 product_id uuid REFERENCES catalog_products(id) ON DELETE SET NULL,
 expires_at timestamptz DEFAULT now() + interval '24 hours',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_assets_cleanup ON catalog_assets(expires_at) WHERE expires_at IS NOT NULL;
ALTER TABLE catalog_images ADD COLUMN asset_id uuid REFERENCES catalog_assets(id);
CREATE UNIQUE INDEX catalog_images_asset ON catalog_images(asset_id) WHERE asset_id IS NOT NULL;
