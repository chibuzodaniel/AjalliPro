"use client";

import { useState } from "react";
import DailyRecordFormModal, { type DailyRecordFormInitial } from "./DailyRecordFormModal";
import type { DailyRecordFull } from "@/lib/records";

interface DriverOption {
  id: string;
  name: string;
  pricePerBag: number;
  loadingFee: number;
}
interface CustomerOption {
  id: string;
  name: string;
  pricePerBag: number;
}

export default function EditDailyRecordButton({
  record,
  drivers,
  customers,
  canEditOpeningStock,
  canEditFactoryPrice,
  canEditLeakageOpening,
}: {
  record: DailyRecordFull;
  drivers: DriverOption[];
  customers: CustomerOption[];
  canEditOpeningStock?: boolean;
  canEditFactoryPrice?: boolean;
  canEditLeakageOpening?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const initial: DailyRecordFormInitial = {
    date: record.date,
    openingStock: record.openingStock,
    production: record.productionLines.map((p) => ({ packerName: p.packerName, bags: p.bags })),
    factoryBags: record.factoryBags,
    factoryBagsFromLeakage: record.factoryBagsFromLeakage,
    factoryPricePerBag: record.factoryPricePerBag,
    factoryCustomerId: record.factoryCustomerId,
    pumpWaterAmount: record.pumpWaterAmount,
    driverSales: record.driverSales.map((d) => ({
      driverId: d.driverId,
      bags: d.bags,
      bonusBags: d.bonusBags,
      loadingFeeWaived: d.loadingFeeWaived,
    })),
    truckDeliveries: record.truckDeliveries.map((t) => ({
      customerId: t.customerId,
      bags: t.bags,
      bonusBags: t.bonusBags,
      ownTruck: t.ownTruck,
      fuelCost: t.fuelCost,
      hiredCost: t.hiredCost,
    })),
    leakageBags: record.leakageBags,
    leakageWasteBags: record.leakageWasteBags,
    expenses: record.expenseItems.map((e) => ({ description: e.description, amount: e.amount, paid: e.paid })),
  };

  return (
    <>
      <button className="icon-btn no-print" title="Edit this record" onClick={() => setOpen(true)}>
        ✎
      </button>
      {open && (
        <DailyRecordFormModal
          mode="edit"
          recordId={record.id}
          open={open}
          onClose={() => setOpen(false)}
          initial={initial}
          leakageOpening={record.leakageOpening}
          drivers={drivers}
          customers={customers}
          canEditOpeningStock={canEditOpeningStock}
          canEditFactoryPrice={canEditFactoryPrice}
          canEditLeakageOpening={canEditLeakageOpening}
        />
      )}
    </>
  );
}
