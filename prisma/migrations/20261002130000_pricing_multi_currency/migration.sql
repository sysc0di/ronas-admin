-- Rename the single-currency columns into the TRY price set, so the
-- existing values are kept as Turkish Lira.
ALTER TABLE "products" RENAME COLUMN "price" TO "priceTry";
ALTER TABLE "products" RENAME COLUMN "discountedPrice" TO "discountedPriceTry";
ALTER TABLE "products" RENAME COLUMN "discountPercent" TO "discountPercentTry";

-- Add the USD price set.
ALTER TABLE "products" ADD COLUMN "priceUsd" DECIMAL(10,2),
ADD COLUMN "discountedPriceUsd" DECIMAL(10,2),
ADD COLUMN "discountPercentUsd" INTEGER;
