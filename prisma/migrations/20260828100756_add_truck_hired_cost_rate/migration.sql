-- AlterTable
ALTER TABLE "PricingSetting" ADD COLUMN     "truckHiredCostPerBag" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TruckDelivery" ADD COLUMN     "hiredCostPerBag" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hiredCostWaived" BOOLEAN NOT NULL DEFAULT false;
