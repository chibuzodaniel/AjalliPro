import { prisma } from "./prisma";
import { dailyRecordInclude } from "./records";
import { computeRevenue } from "./revenue";

export interface BankAccountWithBalance {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  startingBalance: number;
  active: boolean;
  balance: number;
}

/**
 * Current balance = the Super Admin-set starting balance plus every
 * approved daily record's gross income sent to that account — any archive
 * state, since archiving just resets the stock-counting session, not the
 * money that was actually received.
 */
export async function getBankAccountsWithBalances(): Promise<BankAccountWithBalance[]> {
  const [accounts, records] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dailyRecord.findMany({
      where: { status: "APPROVED", bankAccountId: { not: null } },
      include: dailyRecordInclude,
    }),
  ]);

  const incomeByAccount = new Map<string, number>();
  for (const r of records) {
    if (!r.bankAccountId) continue;
    const gross = computeRevenue([r]).gross;
    incomeByAccount.set(r.bankAccountId, (incomeByAccount.get(r.bankAccountId) ?? 0) + gross);
  }

  return accounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountName: a.accountName,
    accountNumber: a.accountNumber,
    startingBalance: a.startingBalance,
    active: a.active,
    balance: a.startingBalance + (incomeByAccount.get(a.id) ?? 0),
  }));
}
