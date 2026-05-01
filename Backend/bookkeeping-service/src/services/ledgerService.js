import { AccountModel } from "../models/Account.js";
import { LedgerBalanceModel } from "../models/LedgerBalance.js";
import { ENTRY_SIDES } from "../constants/accounting.js";
import { toAmount } from "../utils/amount.js";

export const postJournalLinesToLedger = async (journalEntry, session) => {
  for (const line of journalEntry.lines) {
    const account = await AccountModel.findOne({ code: line.accountCode }).session(session);
    if (!account) {
      throw new Error(`Cannot post to missing account ${line.accountCode}`);
    }

    const debitIncrement = toAmount(line.side === ENTRY_SIDES.DEBIT ? line.amount : 0);
    const creditIncrement = toAmount(line.side === ENTRY_SIDES.CREDIT ? line.amount : 0);

    await LedgerBalanceModel.updateOne(
      { accountCode: line.accountCode },
      [
        {
          $set: {
            accountCode: { $ifNull: ["$accountCode", line.accountCode] },
            normalBalance: { $ifNull: ["$normalBalance", account.normalBalance] },
            debitTotal: {
              $round: [
                { $add: [{ $ifNull: ["$debitTotal", 0] }, debitIncrement] },
                2
              ]
            },
            creditTotal: {
              $round: [
                { $add: [{ $ifNull: ["$creditTotal", 0] }, creditIncrement] },
                2
              ]
            }
          }
        },
        {
          $set: {
            balance: {
              $round: [
                {
                  $cond: [
                    { $eq: ["$normalBalance", ENTRY_SIDES.DEBIT] },
                    { $subtract: ["$debitTotal", "$creditTotal"] },
                    { $subtract: ["$creditTotal", "$debitTotal"] }
                  ]
                },
                2
              ]
            }
          }
        },
        {
          $set: {
            history: {
              $concatArrays: [
                { $ifNull: ["$history", []] },
                [
                  {
                    journalEntryId: journalEntry._id,
                    eventId: journalEntry.eventId,
                    eventType: journalEntry.eventType,
                    postedAt: "$$NOW",
                    debit: debitIncrement,
                    credit: creditIncrement,
                    balanceAfter: "$balance"
                  }
                ]
              ]
            }
          }
        }
      ],
      { upsert: true, session }
    );
  }
};

