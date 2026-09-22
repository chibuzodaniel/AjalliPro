-- CreateTable
CREATE TABLE "DailyReportSmsSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "phoneNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReportSmsSetting_pkey" PRIMARY KEY ("id")
);
