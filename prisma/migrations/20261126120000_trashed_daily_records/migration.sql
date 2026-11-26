-- CreateTable
CREATE TABLE "TrashedDailyRecord" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "effects" JSONB NOT NULL DEFAULT '[]',
    "deletedById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,
    "restoredItems" JSONB,
    "notRestoredItems" JSONB,

    CONSTRAINT "TrashedDailyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrashedDailyRecord_deletedAt_idx" ON "TrashedDailyRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "TrashedDailyRecord_restoredAt_idx" ON "TrashedDailyRecord"("restoredAt");

-- AddForeignKey
ALTER TABLE "TrashedDailyRecord" ADD CONSTRAINT "TrashedDailyRecord_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrashedDailyRecord" ADD CONSTRAINT "TrashedDailyRecord_restoredById_fkey" FOREIGN KEY ("restoredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
