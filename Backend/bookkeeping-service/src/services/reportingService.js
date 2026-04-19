import { AccountModel } from "../models/Account.js";
import { LedgerBalanceModel } from "../models/LedgerBalance.js";
import { ACCOUNT_TYPES, ENTRY_SIDES } from "../constants/accounting.js";
import { redisGet, redisSet } from "../config/redis.js";
import { env } from "../config/env.js";

const withCache = async (cacheKey, builder) => {
  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const value = await builder();
  await redisSet(cacheKey, JSON.stringify(value), "EX", env.reportCacheTtlSeconds);
  return value;
};

const getLedgersJoined = async () => {
  const [accounts, ledgers] = await Promise.all([
    AccountModel.find({ active: true }).lean(),
    LedgerBalanceModel.find({}).lean()
  ]);
  const ledgerByCode = new Map(ledgers.map((ledger) => [ledger.accountCode, ledger]));
  return accounts.map((account) => {
    const ledger = ledgerByCode.get(account.code);
    return {
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      normalBalance: account.normalBalance,
      debitTotal: ledger?.debitTotal ?? 0,
      creditTotal: ledger?.creditTotal ?? 0,
      balance: ledger?.balance ?? 0
    };
  });
};

export const getTrialBalance = async () =>
  withCache("report:trial-balance", async () => {
    const rows = await getLedgersJoined();
    const lines = rows.map((row) => ({
      ...row,
      debit: row.normalBalance === ENTRY_SIDES.DEBIT ? Math.max(row.balance, 0) : Math.max(-row.balance, 0),
      credit: row.normalBalance === ENTRY_SIDES.CREDIT ? Math.max(row.balance, 0) : Math.max(-row.balance, 0)
    }));
    const totals = lines.reduce(
      (agg, row) => ({
        totalDebits: agg.totalDebits + row.debit,
        totalCredits: agg.totalCredits + row.credit
      }),
      { totalDebits: 0, totalCredits: 0 }
    );
    return { asOf: new Date().toISOString(), lines, totals };
  });

export const getProfitAndLoss = async () =>
  withCache("report:profit-loss", async () => {
    const rows = await getLedgersJoined();
    const revenue = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.REVENUE)
      .reduce((sum, row) => sum + row.balance, 0);
    const cogs = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.COST_OF_SALES)
      .reduce((sum, row) => sum + row.balance, 0);
    const expenses = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.EXPENSE)
      .reduce((sum, row) => sum + row.balance, 0);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    return {
      asOf: new Date().toISOString(),
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses: expenses,
      netProfit
    };
  });

export const getBalanceSheet = async () =>
  withCache("report:balance-sheet", async () => {
    const rows = await getLedgersJoined();

    const assets = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.ASSET)
      .reduce((sum, row) => sum + row.balance, 0);
    const liabilities = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.LIABILITY)
      .reduce((sum, row) => sum + row.balance, 0);
    const equity = rows
      .filter((row) => row.accountType === ACCOUNT_TYPES.EQUITY)
      .reduce((sum, row) => sum + row.balance, 0);
    const pnl = await getProfitAndLoss();
    const equityWithCurrentEarnings = equity + pnl.netProfit;

    return {
      asOf: new Date().toISOString(),
      assets,
      liabilities,
      equity: equityWithCurrentEarnings,
      liabilitiesAndEquity: liabilities + equityWithCurrentEarnings
    };
  });

