import mongoose from "mongoose";

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    deliveryOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryOrder",
      required: true,
      index: true,
    },
    courierCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierCompany",
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierBranch",
      required: true,
      index: true,
    },
    riderStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourierStaff",
      required: true,
      index: true,
    },
    assignedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: "CourierStaff", default: null },
    assignedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignmentType: { type: String, enum: ["assign", "reassign", "auto"], default: "assign" },
    reason: { type: String, default: "" },
    queuePosition: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed", "cancelled"], default: "active", index: true },
    assignedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

deliveryAssignmentSchema.index({ riderStaffId: 1, status: 1, assignedAt: 1 });
deliveryAssignmentSchema.index({ deliveryOrderId: 1, status: 1 });

const DeliveryAssignment = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);
export default DeliveryAssignment;

