-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SALES_STAFF', 'ADMIN_STAFF', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "DailyRecord" ALTER COLUMN "createdByRole" TYPE "Role_new" USING ("createdByRole"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'SALES_STAFF';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyRecordApprover" BOOLEAN NOT NULL DEFAULT false;
