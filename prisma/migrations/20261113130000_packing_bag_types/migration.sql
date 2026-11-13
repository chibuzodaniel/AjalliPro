-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "packingBagTypeId" TEXT;

-- AlterTable
ALTER TABLE "PricingSetting" DROP COLUMN "packingBagsPricePerBundle";

-- CreateTable
CREATE TABLE "PackingBagType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerBundle" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackingBagType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackingBagType_name_key" ON "PackingBagType"("name");

-- CreateIndex
CREATE INDEX "ExpenseItem_packingBagTypeId_idx" ON "ExpenseItem"("packingBagTypeId");

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_packingBagTypeId_fkey" FOREIGN KEY ("packingBagTypeId") REFERENCES "PackingBagType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingBagType" ADD CONSTRAINT "PackingBagType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
