-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "packingBagsKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PricingSetting" ADD COLUMN     "packingBagsPricePerKg" INTEGER NOT NULL DEFAULT 0;
