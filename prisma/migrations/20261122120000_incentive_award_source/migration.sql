-- AlterTable
ALTER TABLE "DailyRecord" ADD COLUMN     "incentiveBonusBagsFromLeakage" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IncentiveAward" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'FRESH';
