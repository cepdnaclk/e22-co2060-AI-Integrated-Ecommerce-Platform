import { LedgerBalanceModel } from "../models/LedgerBalance.js";
import { AccountModel } from "../models/Account.js";

export const getLedgerByAccountId = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const account = await AccountModel.findOne({ code: accountId }).lean();
    if (!account) {
      return res.status(404).json({ message: `Account ${accountId} not found` });
    }
    const ledger = await LedgerBalanceModel.findOne({ accountCode: accountId }).lean();
    return res.json({
      account,
      ledger: ledger ?? {
        accountCode: accountId,
        normalBalance: account.normalBalance,
        debitTotal: 0,
        creditTotal: 0,
        balance: 0,
        history: []
      }
    });
  } catch (error) {
    return next(error);
  }
};

