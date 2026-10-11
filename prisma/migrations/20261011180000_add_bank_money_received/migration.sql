-- AlterTable
ALTER TABLE "DailyRecord" ADD COLUMN     "bankAmountSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bankMoneyReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bankReceivedAt" TIMESTAMP(3),
ADD COLUMN     "bankReceivedById" TEXT;

-- AddForeignKey
ALTER TABLE "DailyRecord" ADD CONSTRAINT "DailyRecord_bankReceivedById_fkey" FOREIGN KEY ("bankReceivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
