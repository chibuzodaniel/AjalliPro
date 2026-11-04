import { prisma } from "./prisma";

export interface BankAccountExpenseEntry {
  id: string;
  description: string;
  amount: number;
  createdAt: Date;
  createdByName: string;
}

export interface BankAccountCreditEntry {
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
  pendingAmount: number; // sent, logged against this account, but not yet confirmed received — always 0 for the default expense account, see salesDeposited
  totalExpenses: number; // manual debits (BankAccountExpense) only
  expenses: BankAccountExpenseEntry[];
  totalCredits: number; // manual credits (BankAccountCredit) only
  credits: BankAccountCreditEntry[];
  salesDeposited: number; // every approved daily record's gross sales revenue, auto-deposited, since this account became the default — 0 for every other account
  dailyExpensesDebited: number; // approved daily records' expenses actually PAID (amountPaid, not the full owed amount) since this account became the default — never the backlog from before
}

/**
 * Current balance = the Super Admin-set starting balance, plus every
 * manual credit added directly, minus every manual expense debited against
 * it directly, plus (for every account except the one flagged as the
 * default expense account) every confirmed-received transfer logged
 * against it on the Daily Record form — a transfer only counts once
 * Admin/Super Admin ticks it as received (see confirmBankMoneyReceived);
 * until then its amount shows separately as "pending".
 *
 * The default expense account works differently: instead of relying on
 * manually logged transfers, every approved daily record's full gross
 * sales revenue (pump water + factory + driver + truck deliveries — same
 * figure as the Net Income cards) auto-deposits into it directly, and every
 * approved daily record's expense *actually paid so far* (amountPaid —
 * partial payments count for exactly what's been paid, not the full amount
 * owed) auto-debits from it. Both are scoped to *since it became the
 * default* — setting an account as default never pulls in the backlog of
 * sales or expenses from before that point, and the Daily Record form's
 * bank-amount-sent/confirmed-received fields have no effect on its balance
 * (that flow still applies normally to every other account). Any archive
 * state counts, since archiving just resets the stock-counting session,
 * not the money that was actually received or spent.
 */
export async function getBankAccountsWithBalances(): Promise<BankAccountWithBalance[]> {
  const [accounts, records, expenses, credits] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.dailyRecord.findMany({
      where: { status: "APPROVED", bankAccountId: { not: null } },
      select: { bankAccountId: true, bankAmountSent: true, bankMoneyReceived: true },
    }),
    prisma.bankAccountExpense.findMany({
      include: { createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bankAccountCredit.findMany({
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

  const creditsByAccount = new Map<string, BankAccountCreditEntry[]>();
  for (const c of credits) {
    const list = creditsByAccount.get(c.bankAccountId) ?? [];
    list.push({ id: c.id, description: c.description, amount: c.amount, createdAt: c.createdAt, createdByName: c.createdBy.name });
    creditsByAccount.set(c.bankAccountId, list);
  }

  // Only one account can be the default at a time — look up its auto-debited
  // (expenses actually paid) and auto-deposited (gross sales) totals, both
  // scoped to since it became the default.
  const defaultAccount = accounts.find((a) => a.isDefaultExpenseAccount && a.defaultExpenseAccountSetAt);
  const sinceDefault = defaultAccount ? { gte: defaultAccount.defaultExpenseAccountSetAt! } : undefined;
  const [dailyExpensesSinceDefault, salesRecordsSinceDefault] = defaultAccount
    ? await Promise.all([
        prisma.expenseItem
          .aggregate({
            where: { dailyRecord: { status: "APPROVED", createdAt: sinceDefault } },
            _sum: { amountPaid: true },
          })
          .then((r) => r._sum.amountPaid ?? 0),
        prisma.dailyRecord.findMany({
          where: { status: "APPROVED", createdAt: sinceDefault },
          select: {
            factoryBags: true,
            factoryPricePerBag: true,
            pumpWaterAmount: true,
            driverSales: { select: { bags: true, pricePerBag: true } },
            truckDeliveries: { select: { bags: true, pricePerBag: true } },
          },
        }),
      ])
    : [0, []];
  const salesSinceDefault = salesRecordsSinceDefault.reduce((sum, r) => {
    const driverTotal = r.driverSales.reduce((s, d) => s + d.bags * d.pricePerBag, 0);
    const truckTotal = r.truckDeliveries.reduce((s, t) => s + t.bags * t.pricePerBag, 0);
    return sum + r.pumpWaterAmount + r.factoryBags * r.factoryPricePerBag + driverTotal + truckTotal;
  }, 0);

  return accounts.map((a) => {
    const isDefault = a.isDefaultExpenseAccount;
    const accountExpenses = expensesByAccount.get(a.id) ?? [];
    const totalExpenses = accountExpenses.reduce((s, e) => s + e.amount, 0);
    const accountCredits = creditsByAccount.get(a.id) ?? [];
    const totalCredits = accountCredits.reduce((s, c) => s + c.amount, 0);
    const dailyExpensesDebited = isDefault ? dailyExpensesSinceDefault : 0;
    const salesDeposited = isDefault ? salesSinceDefault : 0;
    const receivedAmount = isDefault ? 0 : receivedByAccount.get(a.id) ?? 0;
    const pendingAmount = isDefault ? 0 : pendingByAccount.get(a.id) ?? 0;
    return {
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      startingBalance: a.startingBalance,
      active: a.active,
      isDefaultExpenseAccount: a.isDefaultExpenseAccount,
      balance: a.startingBalance + receivedAmount + salesDeposited + totalCredits - totalExpenses - dailyExpensesDebited,
      pendingAmount,
      totalExpenses,
      expenses: accountExpenses,
      totalCredits,
      credits: accountCredits,
      salesDeposited,
      dailyExpensesDebited,
    };
  });
}
