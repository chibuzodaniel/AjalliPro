-- AlterTable
ALTER TABLE "ExpenseItem" ADD COLUMN     "amountPaid" INTEGER NOT NULL DEFAULT 0;

-- Backfill: expenses already marked paid under the old boolean model were paid in full.
UPDATE "ExpenseItem" SET "amountPaid" = "amount" WHERE "paid" = true;
