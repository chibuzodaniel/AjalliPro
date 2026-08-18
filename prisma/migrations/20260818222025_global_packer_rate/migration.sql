-- AlterTable
ALTER TABLE "Packer" DROP COLUMN "pricePerBag";

-- AlterTable
ALTER TABLE "PricingSetting" ADD COLUMN     "packerPricePerBag" INTEGER NOT NULL DEFAULT 0;
