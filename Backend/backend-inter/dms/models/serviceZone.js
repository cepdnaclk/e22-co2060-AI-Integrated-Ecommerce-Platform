import mongoose from "mongoose";
import { ZONE_TYPES } from "../constants/dmsEnums.js";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const serviceZoneSchema = new mongoose.Schema(
  {
    zoneCode: { type: String, required: true, trim: true },
    zoneName: { type: String, required: true, trim: true },
    courierCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null, index: true },
    zoneType: { type: String, enum: ZONE_TYPES, default: "radius", index: true },
    province: { type: String, default: "", index: true },
    district: { type: String, default: "", index: true },
    city: { type: String, default: "" },
    postalCodes: { type: [String], default: [] },
    center: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    radiusKm: { type: Number, default: null },
    polygonCoordinates: { type: [coordinateSchema], default: [] },
    restricted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 100, index: true },
    notes: { type: String, default: "" },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

serviceZoneSchema.index({ courierCompanyId: 1, zoneCode: 1 }, { unique: true, partialFilterExpression: { courierCompanyId: { $exists: true, $type: "objectId" } } });
serviceZoneSchema.index({ zoneType: 1, isActive: 1, priority: 1 });

const ServiceZone = mongoose.model("ServiceZone", serviceZoneSchema);
export default ServiceZone;

