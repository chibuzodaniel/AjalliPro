-- CreateTable
CREATE TABLE "WeeklyIncentiveSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "customerWeeklyThreshold" INTEGER NOT NULL DEFAULT 500,
    "customerWeeklyBonus" INTEGER NOT NULL DEFAULT 5,
    "driverWeeklyThreshold" INTEGER NOT NULL DEFAULT 1000,
    "driverWeeklyBonus" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" DATETIME NOT NULL
);
