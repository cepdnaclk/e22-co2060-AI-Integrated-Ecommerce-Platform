import mongoose from "mongoose";
import { ENTRY_SIDES, EVENT_TYPES } from "../constants/accounting.js";

const lineTemplateSchema = new mongoose.Schema(
  {
    side: { type: String, enum: Object.values(ENTRY_SIDES), required: true },
    accountCode: { type: String, required: true },
    amountPath: { type: String, required: true },
    descriptionTemplate: { type: String }
  },
  { _id: false }
);

const accountingRuleSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: Object.values(EVENT_TYPES), required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    journalDescriptionTemplate: { type: String, required: true },
    requiresSourceDocument: { type: Boolean, default: true },
    sourceDocumentType: { type: String, default: "SYSTEM_EVENT" },
    lines: { type: [lineTemplateSchema], required: true }
  },
  { timestamps: true, versionKey: false }
);

export const AccountingRuleModel = mongoose.model("AccountingRule", accountingRuleSchema);

