-- Order tracking: a public order number plus shipping fields and status.
-- The storefront hands the tracking code to the customer; the admin panel marks
-- orders as shipped and the storefront then emails the customer.

ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';

-- Human-friendly public order number, e.g. "RC-XXXXXXXX". Shown on the order
-- confirmation and used by the tracking form and the `/track/[code]` page.
ALTER TABLE "orders" ADD COLUMN "trackingCode" TEXT;

-- When the admin panel marked the order as shipped.
ALTER TABLE "orders" ADD COLUMN "shippedAt" TIMESTAMP(3);

-- When the "your order is on its way" email was sent, so a retried notify call
-- never produces a second shipped email for the same order.
ALTER TABLE "orders" ADD COLUMN "shippedEmailSentAt" TIMESTAMP(3);

-- Backfill existing orders with a deterministic code derived from their id.
-- New orders receive a random "RC-XXXXXXXX" code from the application.
UPDATE "orders"
SET "trackingCode" = 'RC-' || upper(substr(md5("id"), 1, 8))
WHERE "trackingCode" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "trackingCode" SET NOT NULL;

CREATE UNIQUE INDEX "orders_trackingCode_key" ON "orders"("trackingCode");