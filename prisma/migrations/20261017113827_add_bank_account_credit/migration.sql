-- CreateTable
CREATE TABLE "BankAccountCredit" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccountCredit_bankAccountId_idx" ON "BankAccountCredit"("bankAccountId");

-- AddForeignKey
ALTER TABLE "BankAccountCredit" ADD CONSTRAINT "BankAccountCredit_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountCredit" ADD CONSTRAINT "BankAccountCredit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

