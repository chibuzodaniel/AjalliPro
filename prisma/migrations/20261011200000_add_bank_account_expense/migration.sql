-- CreateTable
CREATE TABLE "BankAccountExpense" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccountExpense_bankAccountId_idx" ON "BankAccountExpense"("bankAccountId");

-- AddForeignKey
ALTER TABLE "BankAccountExpense" ADD CONSTRAINT "BankAccountExpense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountExpense" ADD CONSTRAINT "BankAccountExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
