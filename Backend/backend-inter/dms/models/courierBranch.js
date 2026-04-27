import mongoose from "mongoose";
import { BRANCH_STATUS } from "../constants/dmsEnums.js";

const operatingWindowSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const courierBranchSchema = new mongoose.Schema(
  {
    courierCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierCompany",
      required: true,
      index: true,
    },
    branchCode: { type: String, required: true, trim: true },
    branchName: { type: String, required: true, trim: true },
    province: { type: String, default: "", trim: true, index: true },
    district: { type: String, default: "", trim: true, index: true },
    city: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    coverageArea: {
      provinces: { type: [String], default: [] },
      districts: { type: [String], default: [] },
      postalCodes: { type: [String], default: [] },
      zoneIds: { type: [mongoose.Schema.Types.ObjectId], ref: "ServiceZone", default: [] },
    },
    operatingHours: { type: [operatingWindowSchema], default: [] },
    capacity: {
      dailyShipmentCapacity: { type: Number, default: 0 },
      maxConcurrentRiders: { type: Number, default: 0 },
      overloadThresholdPercent: { type: Number, default: 90 },
    },
    status: {
      type: String,
      enum: BRANCH_STATUS,
      default: "pending",
      index: true,
    },
    approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    disabledAt: { type: Date, default: null },
    managerStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

courierBranchSchema.index({ courierCompanyId: 1, branchCode: 1 }, { unique: true });

const CourierBranch = mongoose.model("CourierBranch", courierBranchSchema);
export default CourierBranch;

