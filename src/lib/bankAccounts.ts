import { prisma } from "./prisma";

export interface BankAccountWithBalance {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  startingBalance: number;
  active: boolean;
  balance: number;
  pendingAmount: number; // sent, logged against this account, but not yet confirmed received
}

/**
 * Current balance = the Super Admin-set starting balance plus every
 * confirmed-received transfer logged against that account — any archive
 * state, since archiving just resets the stock-counting session, not the
 * money that was actually received. A transfer only counts once
 * Admin/Super Admin ticks it as received (see confirmBankMoneyReceived);
 * until then its amount shows separately as "pending".
 */
export async function getBankAccountsWithBalances(): Promise<BankAccountWithBalance[]> {
  const [accounts, records] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dailyRecord.findMany({
      where: { status: "APPROVED", bankAccountId: { not: null } },
      select: { bankAccountId: true, bankAmountSent: true, bankMoneyReceived: true },
    }),
  ]);

  const receivedByAccount = new Map<string, number>();
  const pendingByAccount = new Map<string, number>();
  for (const r of records) {
    if (!r.bankAccountId) continue;
    const bucket = r.bankMoneyReceived ? receivedByAccount : pendingByAccount;
    bucket.set(r.bankAccountId, (bucket.get(r.bankAccountId) ?? 0) + r.bankAmountSent);
  }

  return accounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountName: a.accountName,
    accountNumber: a.accountNumber,
    startingBalance: a.startingBalance,
    active: a.active,
    balance: a.startingBalance + (receivedByAccount.get(a.id) ?? 0),
    pendingAmount: pendingByAccount.get(a.id) ?? 0,
  }));
}
