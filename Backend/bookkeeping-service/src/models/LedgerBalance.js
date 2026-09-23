import mongoose from "mongoose";
import { ENTRY_SIDES } from "../constants/accounting.js";

const ledgerHistorySchema = new mongoose.Schema(
  {
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    postedAt: { type: Date, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    balanceAfter: { type: Number, required: true },
    currency: { type: String, default: "USD" }
  },
  { _id: false }
);

const ledgerBalanceSchema = new mongoose.Schema(
  {
    accountCode: { type: String, required: true, unique: true, index: true },
    normalBalance: { type: String, enum: Object.values(ENTRY_SIDES), required: true },
    debitTotal: { type: Number, default: 0, min: 0 },
    creditTotal: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
    history: { type: [ledgerHistorySchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export const LedgerBalanceModel = mongoose.model("LedgerBalance", ledgerBalanceSchema);

