-- AlterTable
ALTER TABLE "DailyRecord" ADD COLUMN     "factoryBagsFromLeakage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leakageClosing" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leakageOpening" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "loadingFee" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DriverSale" ADD COLUMN     "bonusBags" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TruckDelivery" (
    "id" TEXT NOT NULL,
    "dailyRecordId" TEXT NOT NULL,
    "customerId" TEXT,
    "bags" INTEGER NOT NULL,
    "ownTruck" BOOLEAN NOT NULL DEFAULT true,
    "fuelCost" INTEGER NOT NULL DEFAULT 0,
    "hiredCost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TruckDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TruckDelivery_dailyRecordId_idx" ON "TruckDelivery"("dailyRecordId");

-- CreateIndex
CREATE INDEX "TruckDelivery_customerId_idx" ON "TruckDelivery"("customerId");

-- AddForeignKey
ALTER TABLE "TruckDelivery" ADD CONSTRAINT "TruckDelivery_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckDelivery" ADD CONSTRAINT "TruckDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
