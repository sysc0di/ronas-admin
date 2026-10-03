-- Product text now lives in "product_translations" (backfilled per locale).
ALTER TABLE "products" DROP COLUMN "name";
ALTER TABLE "products" DROP COLUMN "description";
