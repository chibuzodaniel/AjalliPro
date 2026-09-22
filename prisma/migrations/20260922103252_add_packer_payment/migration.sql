-- CreateTable
CREATE TABLE "PackerPayment" (
    "id" TEXT NOT NULL,
    "packerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidById" TEXT NOT NULL,

    CONSTRAINT "PackerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackerPayment_packerId_idx" ON "PackerPayment"("packerId");

-- AddForeignKey
ALTER TABLE "PackerPayment" ADD CONSTRAINT "PackerPayment_packerId_fkey" FOREIGN KEY ("packerId") REFERENCES "Packer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackerPayment" ADD CONSTRAINT "PackerPayment_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
