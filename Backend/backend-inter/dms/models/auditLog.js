import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["dms_security", "dms_ops", "dms_workflow", "dms_fraud", "notification"],
      default: "dms_ops",
      index: true,
    },
    action: { type: String, required: true, trim: true, index: true },
    severity: { type: String, enum: ["info", "warn", "error", "critical"], default: "info", index: true },
    actor: {
      actorType: {
        type: String,
        enum: ["platform_admin", "dms_staff", "seller", "customer", "system"],
        default: "system",
      },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      staffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
      role: { type: String, default: "" },
    },
    context: {
      courierCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null, index: true },
      branchId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierBranch", default: null, index: true },
      deliveryOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryOrder", default: null, index: true },
      trackingNumber: { type: String, default: "", index: true },
      targetType: { type: String, default: "" },
      targetId: { type: String, default: "" },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, severity: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;

