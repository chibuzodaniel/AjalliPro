-- AlterTable
ALTER TABLE "DailyRecord" DROP COLUMN "driverTruckBagsFromLeakage";

-- AlterTable
ALTER TABLE "DriverSale" ADD COLUMN     "bagsFromLeakage" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TruckDelivery" ADD COLUMN     "bagsFromLeakage" INTEGER NOT NULL DEFAULT 0;
