CREATE TABLE catalog_categories (
  slug text PRIMARY KEY,
  is_collection_category boolean NOT NULL DEFAULT false
);

INSERT INTO catalog_categories (slug) VALUES
  ('personal-care'), ('bath-mobility'), ('daily-living-aids'),
  ('health-monitors'), ('massagers-comfort');

UPDATE catalog_categories
SET is_collection_category = true
WHERE slug = (SELECT collection_category FROM storefront_settings WHERE id = 1);

CREATE UNIQUE INDEX catalog_categories_one_collection_idx
  ON catalog_categories (is_collection_category) WHERE is_collection_category;

ALTER TABLE catalog_products
  ADD CONSTRAINT catalog_products_category_fk
    FOREIGN KEY (category) REFERENCES catalog_categories (slug);

ALTER TABLE storefront_settings DROP COLUMN collection_category;

-- Normalize any legacy sales invalidated by an earlier base price edit.
UPDATE catalog_products
SET discount_price_cents = 0, discount_badge = 'none',
    version = version + 1, updated_at = now()
WHERE (discount_price_cents > 0 AND
       (price_cents IS NULL OR discount_price_cents >= price_cents))
   OR (discount_price_cents = 0 AND discount_badge <> 'none');

ALTER TABLE catalog_products
  ADD CONSTRAINT catalog_products_valid_discount CHECK (
    (discount_price_cents = 0 AND discount_badge = 'none') OR
    (discount_price_cents > 0 AND price_cents IS NOT NULL AND discount_price_cents < price_cents)
  ),
  ADD COLUMN is_discount_price boolean GENERATED ALWAYS AS (discount_price_cents > 0) STORED,
  ADD COLUMN is_sale_tag boolean GENERATED ALWAYS AS (discount_badge <> 'none') STORED,
  ADD COLUMN sale_tag text GENERATED ALWAYS AS (
    CASE discount_badge
      WHEN 'percent-off' THEN
        CASE WHEN (price_cents::bigint - discount_price_cents) * 100 < price_cents THEN '<1'
          ELSE (((price_cents::bigint - discount_price_cents) * 100) / NULLIF(price_cents, 0))::text END || '% OFF'
      WHEN 'flat-percent-off' THEN 'FLAT ' ||
        CASE WHEN (price_cents::bigint - discount_price_cents) * 100 < price_cents THEN '<1'
          ELSE (((price_cents::bigint - discount_price_cents) * 100) / NULLIF(price_cents, 0))::text END || '% OFF'
      WHEN 'save-amount' THEN 'SAVE $' || ((price_cents - discount_price_cents)::numeric / 100)::numeric(12,2)::text
      WHEN 'now-price' THEN 'NOW $' || (discount_price_cents::numeric / 100)::numeric(12,2)::text
      ELSE ''
    END
  ) STORED;
