import { prisma } from "./prisma";

export interface BankAccountExpenseEntry {
  id: string;
  description: string;
  amount: number;
  createdAt: Date;
  createdByName: string;
}

export interface BankAccountWithBalance {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  startingBalance: number;
  active: boolean;
  isDefaultExpenseAccount: boolean;
  balance: number;
  pendingAmount: number; // sent, logged against this account, but not yet confirmed received
  totalExpenses: number; // manual debits (BankAccountExpense) only
  expenses: BankAccountExpenseEntry[];
  dailyExpensesDebited: number; // approved daily records' logged expenses since this account became the default — never the backlog from before
}

/**
 * Current balance = the Super Admin-set starting balance, plus every
 * confirmed-received transfer logged against that account, minus every
 * manual expense debited against it directly, minus (for the one account
 * flagged as the default expense account) every approved daily record's
 * logged expenses *since it became the default* — setting an account as
 * default never pulls in the backlog of expenses logged before that point.
 * Any archive state counts, since archiving just resets the stock-counting
 * session, not the money that was actually received or spent. A transfer
 * only counts once Admin/Super Admin ticks it as received (see
 * confirmBankMoneyReceived); until then its amount shows separately as
 * "pending".
 */
export async function getBankAccountsWithBalances(): Promise<BankAccountWithBalance[]> {
  const [accounts, records, expenses] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dailyRecord.findMany({
      where: { status: "APPROVED", bankAccountId: { not: null } },
      select: { bankAccountId: true, bankAmountSent: true, bankMoneyReceived: true },
    }),
    prisma.bankAccountExpense.findMany({
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const receivedByAccount = new Map<string, number>();
  const pendingByAccount = new Map<string, number>();
  for (const r of records) {
    if (!r.bankAccountId) continue;
    const bucket = r.bankMoneyReceived ? receivedByAccount : pendingByAccount;
    bucket.set(r.bankAccountId, (bucket.get(r.bankAccountId) ?? 0) + r.bankAmountSent);
  }

  const expensesByAccount = new Map<string, BankAccountExpenseEntry[]>();
  for (const e of expenses) {
    const list = expensesByAccount.get(e.bankAccountId) ?? [];
    list.push({ id: e.id, description: e.description, amount: e.amount, createdAt: e.createdAt, createdByName: e.createdBy.name });
    expensesByAccount.set(e.bankAccountId, list);
  }

  // Only one account can be the default at a time — look up its debited
  // total, scoped to expenses logged since it became the default.
  const defaultAccount = accounts.find((a) => a.isDefaultExpenseAccount && a.defaultExpenseAccountSetAt);
  const dailyExpensesSinceDefault = defaultAccount
    ? (
        await prisma.expenseItem.aggregate({
          where: { dailyRecord: { status: "APPROVED", createdAt: { gte: defaultAccount.defaultExpenseAccountSetAt! } } },
          _sum: { amount: true },
        })
      )._sum.amount ?? 0
    : 0;

  return accounts.map((a) => {
    const accountExpenses = expensesByAccount.get(a.id) ?? [];
    const totalExpenses = accountExpenses.reduce((s, e) => s + e.amount, 0);
    const dailyExpensesDebited = a.isDefaultExpenseAccount ? dailyExpensesSinceDefault : 0;
    return {
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      startingBalance: a.startingBalance,
      active: a.active,
      isDefaultExpenseAccount: a.isDefaultExpenseAccount,
      balance: a.startingBalance + (receivedByAccount.get(a.id) ?? 0) - totalExpenses - dailyExpensesDebited,
      pendingAmount: pendingByAccount.get(a.id) ?? 0,
      totalExpenses,
      expenses: accountExpenses,
      dailyExpensesDebited,
    };
  });
}
