import mongoose from "mongoose";
import { SETTLEMENT_STATES } from "../constants/dmsEnums.js";

const deliverySettlementSchema = new mongoose.Schema(
  {
    settlementCode: { type: String, required: true, unique: true, trim: true, index: true },
    deliveryOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryOrder", required: true, index: true },
    trackingNumber: { type: String, required: true, trim: true, index: true },
    courierCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null, index: true },
    riderStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    codAmount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    codFee: { type: Number, default: 0, min: 0 },
    platformCommission: { type: Number, default: 0, min: 0 },
    state: { type: String, enum: SETTLEMENT_STATES, default: "rider_collected", index: true },
    timeline: {
      riderCollectedAt: { type: Date, default: null },
      branchReceivedAt: { type: Date, default: null },
      platformSettledAt: { type: Date, default: null },
      sellerPaidAt: { type: Date, default: null },
    },
    reconciliation: {
      expectedAmount: { type: Number, default: 0 },
      receivedAmount: { type: Number, default: 0 },
      variance: { type: Number, default: 0 },
      reconciledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reconciledAt: { type: Date, default: null },
      notes: { type: String, default: "" },
    },
    flaggedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

deliverySettlementSchema.index({ state: 1, courierCompanyId: 1, createdAt: -1 });

const DeliverySettlement = mongoose.model("DeliverySettlement", deliverySettlementSchema);
export default DeliverySettlement;

