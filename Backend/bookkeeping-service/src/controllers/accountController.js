import { ACCOUNT_TYPES } from "../constants/accounting.js";
import { AccountModel } from "../models/Account.js";
import { LedgerBalanceModel } from "../models/LedgerBalance.js";
import { redisGet, redisSet } from "../config/redis.js";
import { env } from "../config/env.js";

const clampHistoryLimit = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 12;
  return Math.max(1, Math.min(parsed, 100));
};

const clampAccountSearchLimit = (value) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(parsed, 100));
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const accountTypeAliases = Object.freeze({
  ASSET: ACCOUNT_TYPES.ASSET,
  ASSETS: ACCOUNT_TYPES.ASSET,
  LIABILITY: ACCOUNT_TYPES.LIABILITY,
  LIABILITIES: ACCOUNT_TYPES.LIABILITY,
  EQUITY: ACCOUNT_TYPES.EQUITY,
  REVENUE: ACCOUNT_TYPES.REVENUE,
  REVENUES: ACCOUNT_TYPES.REVENUE,
  EXPENSE: ACCOUNT_TYPES.EXPENSE,
  EXPENSES: ACCOUNT_TYPES.EXPENSE,
  COST_OF_SALES: ACCOUNT_TYPES.COST_OF_SALES,
  OTHER_INCOME: ACCOUNT_TYPES.OTHER_INCOME,
  OTHER_EXPENSE: ACCOUNT_TYPES.OTHER_EXPENSE
});

const normalizeAccountTypeFilter = (rawType) => {
  const text = String(rawType ?? "").trim();
  if (!text) {
    return [];
  }

  const requestedTypes = text
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const normalized = [...new Set(requestedTypes.map((type) => accountTypeAliases[type]).filter(Boolean))];
  if (normalized.length === 0) {
    throw new Error(`Invalid account type filter: ${rawType}`);
  }

  return normalized;
};

export const getAccountsTerminal = async (req, res, next) => {
  try {
    const historyLimit = clampHistoryLimit(req.query.historyLimit);
    const [accounts, ledgers] = await Promise.all([
      AccountModel.find({ active: true }).sort({ code: 1 }).lean(),
      LedgerBalanceModel.find({}).lean()
    ]);

    const ledgerByCode = new Map(ledgers.map((ledger) => [ledger.accountCode, ledger]));
    const groupedByType = Object.fromEntries(
      Object.values(ACCOUNT_TYPES).map((type) => [type, []])
    );

    for (const account of accounts) {
      const ledger = ledgerByCode.get(account.code);
      const history = (ledger?.history ?? [])
        .slice(-historyLimit)
        .reverse()
        .map((entry) => ({
          eventId: entry.eventId,
          eventType: entry.eventType,
          postedAt: entry.postedAt,
          debit: entry.debit ?? 0,
          credit: entry.credit ?? 0,
          balanceAfter: entry.balanceAfter ?? 0
        }));

      groupedByType[account.type].push({
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
        isContra: account.isContra ?? false,
        debitTotal: ledger?.debitTotal ?? 0,
        creditTotal: ledger?.creditTotal ?? 0,
        balance: ledger?.balance ?? 0,
        history
      });
    }

    res.json({
      asOf: new Date().toISOString(),
      historyLimit,
      accountTypes: groupedByType
    });
  } catch (error) {
    next(error);
  }
};

export const searchAccounts = async (req, res, next) => {
  try {
    const query = String(req.query.query ?? "").trim();
    const typeFilter = normalizeAccountTypeFilter(req.query.type);
    const limit = clampAccountSearchLimit(req.query.limit);

    const cacheKey = `accounts:search:${query.toLowerCase()}:${typeFilter.join("|") || "ALL"}:${limit}`;
    const cached = await redisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const searchFilter = { active: true };
    if (typeFilter.length > 0) {
      searchFilter.type = { $in: typeFilter };
    }
    if (query) {
      const regex = new RegExp(escapeRegex(query), "i");
      searchFilter.$or = [{ code: regex }, { name: regex }];
    }

    const accounts = await AccountModel.find(searchFilter)
      .sort({ code: 1 })
      .limit(limit)
      .select({ code: 1, name: 1, type: 1, normalBalance: 1, _id: 0 })
      .lean();

    const payload = {
      query,
      types: typeFilter.length > 0 ? typeFilter : null,
      limit,
      count: accounts.length,
      accounts
    };

    await redisSet(cacheKey, JSON.stringify(payload), "EX", Math.max(30, env.reportCacheTtlSeconds));
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

