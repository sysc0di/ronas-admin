-- The material/construction/finish attributes are superseded by the JSON
-- technical-details rows. Keep the columns and their values (no data loss) but
-- stop requiring them, so products no longer have to fill in unused fields.

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "material" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "construction" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "finish" DROP NOT NULL;
