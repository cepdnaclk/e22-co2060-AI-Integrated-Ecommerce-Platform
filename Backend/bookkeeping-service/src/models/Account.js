import mongoose from "mongoose";
import { ACCOUNT_TYPES, ENTRY_SIDES } from "../constants/accounting.js";

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(ACCOUNT_TYPES), required: true, index: true },
    normalBalance: { type: String, enum: Object.values(ENTRY_SIDES), required: true },
    isContra: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, versionKey: false }
);

export const AccountModel = mongoose.model("Account", accountSchema);

