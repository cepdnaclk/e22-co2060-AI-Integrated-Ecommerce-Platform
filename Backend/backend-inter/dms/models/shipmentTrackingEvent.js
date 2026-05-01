import mongoose from "mongoose";
import { SCAN_TYPES } from "../constants/dmsEnums.js";

const shipmentTrackingEventSchema = new mongoose.Schema(
  {
    deliveryOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryOrder",
      required: true,
      index: true,
    },
    trackingNumber: { type: String, required: true, trim: true, index: true },
    courierCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierCompany",
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null, index: true },
    riderStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null, index: true },
    scannedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    scannedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    scanType: { type: String, enum: SCAN_TYPES, required: true, index: true },
    scanMethod: { type: String, enum: ["barcode", "qr", "manual", "system"], default: "barcode" },
    statusAfterScan: { type: String, default: "" },
    notes: { type: String, default: "" },
    geolocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    anomalyFlags: { type: [String], default: [] },
    suspicious: { type: Boolean, default: false, index: true },
    occurredAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

shipmentTrackingEventSchema.index({ deliveryOrderId: 1, occurredAt: -1 });
shipmentTrackingEventSchema.index({ scannedByStaffId: 1, occurredAt: -1 });

const ShipmentTrackingEvent = mongoose.model("ShipmentTrackingEvent", shipmentTrackingEventSchema);
export default ShipmentTrackingEvent;

