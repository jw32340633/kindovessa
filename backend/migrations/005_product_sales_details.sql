ALTER TABLE catalog_products DROP COLUMN source_url;
ALTER TABLE catalog_products DROP COLUMN rating_source;
ALTER TABLE catalog_products DROP CONSTRAINT catalog_products_review_count_check;
ALTER TABLE catalog_products ADD CONSTRAINT catalog_products_review_count_check CHECK(review_count>=0);
ALTER TABLE catalog_products ADD COLUMN sold_count integer CHECK(sold_count>=0);
UPDATE catalog_products SET details=details-ARRAY['featured','manufacturer','features','included','warranty'],version=version+1,updated_at=now();
