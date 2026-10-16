-- AlterTable
ALTER TABLE "TodoItem" ADD COLUMN     "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "TodoItem_assignedToId_idx" ON "TodoItem"("assignedToId");

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
