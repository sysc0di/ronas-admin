-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "regularPriceTry" DECIMAL(10,2),
ADD COLUMN     "regularPriceUsd" DECIMAL(10,2),
ADD COLUMN     "unitPriceTry" DECIMAL(10,2),
ADD COLUMN     "unitPriceUsd" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TRY';
