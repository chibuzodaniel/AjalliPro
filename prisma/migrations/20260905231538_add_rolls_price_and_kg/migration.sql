-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "rollsKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PricingSetting" ADD COLUMN     "rollsPricePerKg" INTEGER NOT NULL DEFAULT 0;
