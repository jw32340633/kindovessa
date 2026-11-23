CREATE TABLE catalog_products (
 id uuid PRIMARY KEY,
 name varchar(200) NOT NULL CHECK(length(trim(name))>0),
 slug varchar(220) NOT NULL UNIQUE,
 brand varchar(100) NOT NULL DEFAULT '',
 category text NOT NULL CHECK(category IN ('personal-care','bath-mobility','daily-living-aids','health-monitors','massagers-comfort')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
 source_url text NOT NULL DEFAULT '', details jsonb NOT NULL DEFAULT '{}',
 rating numeric(2,1) CHECK(rating BETWEEN 0 AND 5),
 review_count integer CHECK(review_count>0), rating_source text,
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((rating IS NULL AND review_count IS NULL AND rating_source IS NULL) OR (rating IS NOT NULL AND review_count IS NOT NULL AND rating_source IS NOT NULL))
);
CREATE INDEX catalog_products_filter_idx ON catalog_products(category,status);
CREATE TABLE catalog_variants (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
 sku varchar(100), options varchar(500) NOT NULL DEFAULT '',
 price_cents integer CHECK(price_cents>=0), cost_cents integer CHECK(cost_cents>=0),
 stock integer CHECK(stock>=0), weight_grams integer CHECK(weight_grams>=0),
 sort_order integer NOT NULL CHECK(sort_order>=0), UNIQUE(product_id,sort_order)
);
CREATE UNIQUE INDEX catalog_variants_sku_idx ON catalog_variants(lower(sku)) WHERE sku IS NOT NULL;
CREATE TABLE catalog_images (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
 url text NOT NULL CHECK(url LIKE 'https://%'), alt varchar(250) NOT NULL CHECK(length(trim(alt))>0),
 name varchar(250) NOT NULL DEFAULT '', sort_order integer NOT NULL CHECK(sort_order>=0), UNIQUE(product_id,sort_order)
);
-- Explicit requested sample. Draft only; no commercial claims or invented stock/prices.
INSERT INTO catalog_products(id,name,slug,brand,category,status,details) VALUES
('6ff589d8-c2a2-4917-ae30-ac0b8dc02600','Sample product - draft only','sample-product-draft-only','','daily-living-aids','draft','{"shortDescription":"Sample record for reviewing the admin table. Replace or delete before publishing."}');
INSERT INTO catalog_variants(id,product_id,sort_order) VALUES ('6ff589d8-c2a2-4917-ae30-ac0b8dc02601','6ff589d8-c2a2-4917-ae30-ac0b8dc02600',0);
