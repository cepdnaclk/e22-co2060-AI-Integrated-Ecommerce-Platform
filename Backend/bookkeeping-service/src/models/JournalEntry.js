import mongoose from "mongoose";
import { ENTRY_SIDES } from "../constants/accounting.js";

const journalLineSchema = new mongoose.Schema(
  {
    accountCode: { type: String, required: true, index: true },
    side: { type: String, enum: Object.values(ENTRY_SIDES), required: true },
    amount: { type: Number, required: true, min: 0 },
    narration: { type: String, default: "" }
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    eventTimestamp: { type: Date, required: true },
    sourceDocumentType: { type: String, default: "SYSTEM_EVENT" },
    sourceDocumentId: { type: String, required: true },
    description: { type: String, required: true },
    lines: { type: [journalLineSchema], required: true },
    totalDebits: { type: Number, required: true, min: 0 },
    totalCredits: { type: Number, required: true, min: 0 },
    reversalOfJournalEntryId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true }
  },
  { timestamps: true, versionKey: false }
);

journalEntrySchema.index({ sourceDocumentType: 1, sourceDocumentId: 1 });
journalEntrySchema.index({ createdAt: -1 });

export const JournalEntryModel = mongoose.model("JournalEntry", journalEntrySchema);

