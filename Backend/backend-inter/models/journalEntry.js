import mongoose from "mongoose";

const journalEntrySchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true },
    eventId: { type: String, required: true },
    orderId: { type: String },
    paymentReference: { type: String },
    sellerId: { type: String },
    eventType: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "COMMITTED", "FAILED"], default: "PENDING" },
    lines: [
      {
        accountCode: { type: String, required: true },
        accountName: { type: String },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
        description: { type: String }
      }
    ],
    metadata: { type: mongoose.Schema.Types.Mixed },
    errorReason: { type: String }
  },
  { timestamps: true }
);

journalEntrySchema.index({ eventId: 1, eventType: 1 }, { unique: true });
journalEntrySchema.index({ orderId: 1 });
journalEntrySchema.index({ transactionId: 1 });

const JournalEntry = mongoose.model("JournalEntry", journalEntrySchema);

export default JournalEntry;
