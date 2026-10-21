-- Product gallery: extra images shown next to the main image on the product
-- detail page. Stored as delivery URLs, exactly like "products"."image".

ALTER TABLE "products" ADD COLUMN "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[];
