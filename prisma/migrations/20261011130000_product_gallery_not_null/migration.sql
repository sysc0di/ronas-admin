-- The Prisma schema declares the gallery as a non-null list, so the column
-- has to be NOT NULL as well: a stray NULL would break every catalog query.

ALTER TABLE "products" ALTER COLUMN "gallery" SET NOT NULL;
