-- AlterTable
ALTER TABLE "products" ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "discountedPrice" DECIMAL(10,2),
ADD COLUMN     "discountPercent" INTEGER;
