import mongoose from "mongoose";
import { COURIER_COMPANY_STATUS } from "../constants/dmsEnums.js";

const serviceRegionSchema = new mongoose.Schema(
  {
    province: { type: String, default: "" },
    district: { type: String, default: "" },
    city: { type: String, default: "" },
    postalPrefixes: { type: [String], default: [] },
  },
  { _id: false }
);

const courierCompanySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true, unique: true },
    businessLicenseNumber: { type: String, default: "", trim: true },
    businessLicenseVerified: { type: Boolean, default: false },
    address: { type: String, default: "", trim: true },
    province: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    postalCode: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    serviceRegions: { type: [serviceRegionSchema], default: [] },
    status: {
      type: String,
      enum: COURIER_COMPANY_STATUS,
      default: "pending",
      index: true,
    },
    contract: {
      contractCode: { type: String, default: "" },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      termsSummary: { type: String, default: "" },
    },
    capacity: {
      maxDailyShipments: { type: Number, default: 0 },
      maxBranches: { type: Number, default: 0 },
      maxRiders: { type: Number, default: 0 },
    },
    approval: {
      approvedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      approvedAt: { type: Date, default: null },
      suspendedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      suspendedAt: { type: Date, default: null },
      remarks: { type: String, default: "" },
    },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true }
);

courierCompanySchema.index({ companyName: "text", registrationNumber: "text" });

const CourierCompany = mongoose.model("CourierCompany", courierCompanySchema);
export default CourierCompany;

