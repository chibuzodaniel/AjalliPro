-- Drop the old nullable FK so we can tighten packerId to NOT NULL
ALTER TABLE "ProductionLine" DROP CONSTRAINT "ProductionLine_packerId_fkey";

-- Now every row has been backfilled with a real packerId — lock it down
ALTER TABLE "ProductionLine" ALTER COLUMN "packerId" SET NOT NULL;

-- Free-text packer name is fully replaced by the Packer relation
ALTER TABLE "ProductionLine" DROP COLUMN "packerName";

-- Re-add the FK, restricting deletes now that the column is required
-- (matches the existing DriverSale -> Driver / TruckDelivery -> Customer pattern)
ALTER TABLE "ProductionLine" ADD CONSTRAINT "ProductionLine_packerId_fkey" FOREIGN KEY ("packerId") REFERENCES "Packer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
