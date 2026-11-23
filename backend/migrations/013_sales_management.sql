ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS featured_product boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_price_cents integer NOT NULL DEFAULT 0 CHECK (discount_price_cents >= 0),
  ADD COLUMN IF NOT EXISTS discount_badge text NOT NULL DEFAULT 'none'
    CHECK (discount_badge IN ('none', 'percent-off', 'save-amount', 'now-price', 'flat-percent-off'));

CREATE INDEX IF NOT EXISTS catalog_products_featured_product_idx
  ON catalog_products(featured_product) WHERE featured_product;

CREATE TABLE IF NOT EXISTS storefront_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  collection_category text NULL CHECK (collection_category IS NULL OR collection_category IN (
    'personal-care', 'bath-mobility', 'daily-living-aids', 'health-monitors', 'massagers-comfort'
  )),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO storefront_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
