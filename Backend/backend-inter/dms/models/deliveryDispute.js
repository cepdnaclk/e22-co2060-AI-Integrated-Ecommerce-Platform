import mongoose from "mongoose";
import { DISPUTE_STATUS, DISPUTE_TYPES } from "../constants/dmsEnums.js";

const disputeEvidenceSchema = new mongoose.Schema(
  {
    type: { type: String, default: "note" },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
    uploadedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    uploadedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliveryDisputeSchema = new mongoose.Schema(
  {
    disputeCode: { type: String, required: true, unique: true, trim: true, index: true },
    deliveryOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryOrder", required: true, index: true },
    trackingNumber: { type: String, required: true, trim: true, index: true },
    courierCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null, index: true },
    disputeType: { type: String, enum: DISPUTE_TYPES, required: true, index: true },
    raisedByType: {
      type: String,
      enum: ["customer", "seller", "courier_staff", "platform_admin", "system"],
      required: true,
    },
    raisedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    raisedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: DISPUTE_STATUS, default: "open", index: true },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    assignedInvestigatorStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    evidence: { type: [disputeEvidenceSchema], default: [] },
    resolution: {
      decision: { type: String, default: "" },
      remarks: { type: String, default: "" },
      resolvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      resolvedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

deliveryDisputeSchema.index({ status: 1, priority: 1, createdAt: -1 });

const DeliveryDispute = mongoose.model("DeliveryDispute", deliveryDisputeSchema);
export default DeliveryDispute;

