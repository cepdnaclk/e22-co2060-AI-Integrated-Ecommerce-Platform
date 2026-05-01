import mongoose from "mongoose";

const manualJournalLineSchema = new mongoose.Schema(
  {
    debitAccountCode: { type: String, required: true, index: true },
    creditAccountCode: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const manualJournalEntrySchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    referenceNo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["DRAFT", "POSTED", "REVERSED"],
      default: "DRAFT",
      index: true
    },
    lines: { type: [manualJournalLineSchema], required: true },
    journalEntryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    postedAt: { type: Date, default: null },
    reversedAt: { type: Date, default: null },
    reversalOfTransactionId: { type: String, default: null, index: true },
    reversedByTransactionId: { type: String, default: null, index: true }
  },
  { timestamps: true, versionKey: false }
);

manualJournalEntrySchema.index({ date: -1, createdAt: -1 });

export const ManualJournalEntryModel = mongoose.model("ManualJournalEntry", manualJournalEntrySchema);

