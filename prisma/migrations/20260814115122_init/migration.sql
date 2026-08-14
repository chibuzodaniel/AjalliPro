-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES_STAFF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "openingStock" INTEGER NOT NULL,
    "closingStock" INTEGER NOT NULL,
    "factoryBags" INTEGER NOT NULL DEFAULT 0,
    "factoryPricePerBag" INTEGER NOT NULL DEFAULT 0,
    "factoryCustomerId" TEXT,
    "pumpWaterAmount" INTEGER NOT NULL DEFAULT 0,
    "leakageBags" INTEGER NOT NULL DEFAULT 0,
    "expenseRolls" INTEGER NOT NULL DEFAULT 0,
    "expensePackingBags" INTEGER NOT NULL DEFAULT 0,
    "expenseGas" INTEGER NOT NULL DEFAULT 0,
    "expenseOther" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyRecord_factoryCustomerId_fkey" FOREIGN KEY ("factoryCustomerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DailyRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT NOT NULL,
    "packerName" TEXT NOT NULL,
    "bags" INTEGER NOT NULL,
    CONSTRAINT "ProductionLine_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "pricePerBag" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Driver_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Driver_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "customerId" TEXT,
    "bags" INTEGER NOT NULL,
    "pricePerBag" INTEGER NOT NULL,
    "loadingFee" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DriverSale_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverSale_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DriverSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncentiveTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecord_date_key" ON "DailyRecord"("date");

-- CreateIndex
CREATE INDEX "DailyRecord_status_idx" ON "DailyRecord"("status");

-- CreateIndex
CREATE INDEX "DailyRecord_date_idx" ON "DailyRecord"("date");

-- CreateIndex
CREATE INDEX "ProductionLine_dailyRecordId_idx" ON "ProductionLine"("dailyRecordId");

-- CreateIndex
CREATE INDEX "DriverSale_dailyRecordId_idx" ON "DriverSale"("dailyRecordId");

-- CreateIndex
CREATE INDEX "DriverSale_driverId_idx" ON "DriverSale"("driverId");

-- CreateIndex
CREATE INDEX "DriverSale_customerId_idx" ON "DriverSale"("customerId");
