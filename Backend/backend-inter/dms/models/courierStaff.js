import mongoose from "mongoose";
import { STAFF_ROLES, STAFF_STATUS } from "../constants/dmsEnums.js";

const courierStaffSchema = new mongoose.Schema(
  {
    courierCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierCompany",
      required: true,
      index: true,
    },
    assignedBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierBranch",
      default: null,
      index: true,
    },
    authUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    employeeId: { type: String, required: true, trim: true },
    role: { type: String, enum: STAFF_ROLES, required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    idVerification: {
      idType: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date, default: null },
      verifiedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    status: {
      type: String,
      enum: STAFF_STATUS,
      default: "pending",
      index: true,
    },
    availability: {
      isOnline: { type: Boolean, default: false },
      shiftStart: { type: String, default: "" },
      shiftEnd: { type: String, default: "" },
    },
    performance: {
      completedDeliveries: { type: Number, default: 0 },
      failedDeliveries: { type: Number, default: 0 },
      onTimeDeliveries: { type: Number, default: 0 },
    },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

courierStaffSchema.index({ courierCompanyId: 1, employeeId: 1 }, { unique: true });

const CourierStaff = mongoose.model("CourierStaff", courierStaffSchema);
export default CourierStaff;

