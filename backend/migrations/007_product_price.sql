ALTER TABLE catalog_products
  ADD COLUMN price_cents integer CHECK (price_cents >= 0);
