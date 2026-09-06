-- AlterTable
ALTER TABLE "ExpenseItem" DROP COLUMN "packingBagsKg",
ADD COLUMN     "packingBagsBundles" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PricingSetting" DROP COLUMN "packingBagsPricePerKg",
ADD COLUMN     "packingBagsPricePerBundle" INTEGER NOT NULL DEFAULT 0;
