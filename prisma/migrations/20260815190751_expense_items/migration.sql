/*
  Warnings:

  - You are about to drop the column `expenseGas` on the `DailyRecord` table. All the data in the column will be lost.
  - You are about to drop the column `expenseOther` on the `DailyRecord` table. All the data in the column will be lost.
  - You are about to drop the column `expensePackingBags` on the `DailyRecord` table. All the data in the column will be lost.
  - You are about to drop the column `expenseRolls` on the `DailyRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DailyRecord" DROP COLUMN "expenseGas",
DROP COLUMN "expenseOther",
DROP COLUMN "expensePackingBags",
DROP COLUMN "expenseRolls";

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL,
    "dailyRecordId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,

    CONSTRAINT "ExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseItem_dailyRecordId_idx" ON "ExpenseItem"("dailyRecordId");

-- CreateIndex
CREATE INDEX "ExpenseItem_paid_idx" ON "ExpenseItem"("paid");

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseItem" ADD CONSTRAINT "ExpenseItem_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
