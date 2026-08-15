-- CreateTable
CREATE TABLE "PricingSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "factoryPricePerBag" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSetting_pkey" PRIMARY KEY ("id")
);
