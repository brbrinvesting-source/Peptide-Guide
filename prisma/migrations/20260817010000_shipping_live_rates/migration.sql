-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "weightOz" DOUBLE PRECISION NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "ShippingMethod" ADD COLUMN     "carrierServiceToken" TEXT,
ADD COLUMN     "rateType" TEXT NOT NULL DEFAULT 'FLAT';

