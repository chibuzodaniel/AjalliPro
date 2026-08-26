-- AlterTable
ALTER TABLE "PricingSetting" ADD COLUMN     "truckLoadingFeePerBag" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "truckOffloadingFeePerBag" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TruckDelivery" ADD COLUMN     "loadingFeePerBag" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loadingFeeWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offloadingFeePerBag" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offloadingFeeWaived" BOOLEAN NOT NULL DEFAULT false;
