-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "pricePerBag" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TruckDelivery" ADD COLUMN     "pricePerBag" INTEGER NOT NULL DEFAULT 0;
