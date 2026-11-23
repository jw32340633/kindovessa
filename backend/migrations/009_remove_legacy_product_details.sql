-- Product type and model number are no longer catalog fields.
-- Removing the keys keeps existing records aligned with the admin/API contract.
UPDATE catalog_products
SET details = details - 'productType' - 'modelNumber';
