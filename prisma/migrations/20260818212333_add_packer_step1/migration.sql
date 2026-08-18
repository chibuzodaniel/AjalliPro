-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "packerId" TEXT;

-- AlterTable
ALTER TABLE "ProductionLine" ADD COLUMN     "packerId" TEXT,
ADD COLUMN     "pricePerBag" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Packer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "pricePerBag" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Packer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseItem_packerId_idx" ON "ExpenseItem"("packerId");

-- CreateIndex
CREATE INDEX "ProductionLine_packerId_idx" ON "ProductionLine"("packerId");

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_packerId_fkey" FOREIGN KEY ("packerId") REFERENCES "Packer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_packerId_fkey" FOREIGN KEY ("packerId") REFERENCES "Packer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Packer" ADD CONSTRAINT "Packer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
