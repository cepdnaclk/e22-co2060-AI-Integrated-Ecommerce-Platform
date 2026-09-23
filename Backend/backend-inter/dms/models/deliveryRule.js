import mongoose from "mongoose";
import { RULE_SCOPES } from "../constants/dmsEnums.js";

const deliveryRuleSchema = new mongoose.Schema(
  {
    ruleName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scope: { type: String, enum: RULE_SCOPES, default: "routing", index: true },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, index: true },
    courierCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null, index: true },
    conditions: {
      province: { type: String, default: "" },
      district: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCodePrefix: { type: String, default: "" },
      minCodAmount: { type: Number, default: null },
      branchOverloadPercent: { type: Number, default: null },
      requiresServiceZone: { type: Boolean, default: false },
    },
    actions: {
      assignBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null },
      alternateBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null },
      requireExtraVerification: { type: Boolean, default: false },
      feeMultiplier: { type: Number, default: 1 },
      priorityLevel: { type: String, default: "" },
    },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

deliveryRuleSchema.index({ scope: 1, isActive: 1, priority: 1 });

const DeliveryRule = mongoose.model("DeliveryRule", deliveryRuleSchema);
export default DeliveryRule;

