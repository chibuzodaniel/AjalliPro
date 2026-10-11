"use client";

import { useState } from "react";
import DailyRecordFormModal, { type DailyRecordFormInitial } from "./DailyRecordFormModal";
import { todayISO } from "@/lib/week";

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
interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}
export default function AddDailyRecordButton({
  openingStock,
  leakageOpening,
  drivers,
  customers,
  bankAccounts,
  canEditOpeningStock,
  factoryPricePerBag,
  canEditFactoryPrice,
  canEditLeakageOpening,
  packerPricePerBag,
  truckLoadingFeePerBag,
  truckOffloadingFeePerBag,
  truckHiredCostPerBag,
  rollsPricePerKg,
  packingBagsPricePerBundle,
}: {
  openingStock: number;
  leakageOpening: number;
  drivers: DriverOption[];
  customers: CustomerOption[];
  bankAccounts: BankAccountOption[];
  canEditOpeningStock?: boolean;
  factoryPricePerBag: number;
  canEditFactoryPrice?: boolean;
  canEditLeakageOpening?: boolean;
  packerPricePerBag: number;
  truckLoadingFeePerBag: number;
  truckOffloadingFeePerBag: number;
  truckHiredCostPerBag: number;
  rollsPricePerKg: number;
  packingBagsPricePerBundle: number;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const initial: DailyRecordFormInitial = {
    date: todayISO(),
    openingStock,
    production: [],
    factoryBags: 0,
    factoryBagsFromLeakage: 0,
    factoryPricePerBag,
    factoryCustomerId: null,
    pumpWaterAmount: 0,
    driverSales: [],
    truckDeliveries: [],
    leakageBags: 0,
    leakageWasteBags: 0,
    expenses: [],
    bankAccountId: null,
  };

  return (
    <>
      <button className="btn btn-primary no-print" onClick={() => setOpen(true)}>
        + New daily entry
      </button>
      {open && (
        <DailyRecordFormModal
          key={formKey}
          mode="create"
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => setFormKey((k) => k + 1)}
          initial={initial}
          leakageOpening={leakageOpening}
          drivers={drivers}
          customers={customers}
          bankAccounts={bankAccounts}
          canEditOpeningStock={canEditOpeningStock}
          canEditFactoryPrice={canEditFactoryPrice}
          canEditLeakageOpening={canEditLeakageOpening}
          packerPricePerBag={packerPricePerBag}
          truckLoadingFeePerBag={truckLoadingFeePerBag}
          truckOffloadingFeePerBag={truckOffloadingFeePerBag}
          truckHiredCostPerBag={truckHiredCostPerBag}
          rollsPricePerKg={rollsPricePerKg}
          packingBagsPricePerBundle={packingBagsPricePerBundle}
        />
      )}
    </>
  );
}
