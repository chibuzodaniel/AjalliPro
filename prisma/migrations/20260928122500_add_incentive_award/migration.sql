-- AlterTable
ALTER TABLE "DailyRecord" ADD COLUMN     "incentiveBonusBags" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "IncentiveAward" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "customerId" TEXT,
    "driverId" TEXT,
    "weekKey" TEXT NOT NULL,
    "bonusBags" INTEGER NOT NULL,
    "dailyRecordId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT NOT NULL,

    CONSTRAINT "IncentiveAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncentiveAward_weekKey_idx" ON "IncentiveAward"("weekKey");

-- CreateIndex
CREATE INDEX "IncentiveAward_customerId_idx" ON "IncentiveAward"("customerId");

-- CreateIndex
CREATE INDEX "IncentiveAward_driverId_idx" ON "IncentiveAward"("driverId");

-- AddForeignKey
ALTER TABLE "IncentiveAward" ADD CONSTRAINT "IncentiveAward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveAward" ADD CONSTRAINT "IncentiveAward_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveAward" ADD CONSTRAINT "IncentiveAward_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveAward" ADD CONSTRAINT "IncentiveAward_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
