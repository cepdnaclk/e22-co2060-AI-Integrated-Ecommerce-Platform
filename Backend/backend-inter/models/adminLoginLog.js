import mongoose from "mongoose";

/**
 * Admin Login Log — audit trail for all admin login attempts.
 */
const adminLoginLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: "unknown",
    },
    device: {
      type: String,
      default: "unknown",
    },
    loginTime: {
      type: Date,
      default: Date.now,
    },
    success: {
      type: Boolean,
      default: false,
    },
    faceVerified: {
      type: Boolean,
      default: false,
    },
    faceSkipped: {
      type: Boolean,
      default: false,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

adminLoginLogSchema.index({ adminId: 1, createdAt: -1 });
adminLoginLogSchema.index({ ipAddress: 1, createdAt: -1 });

const AdminLoginLog = mongoose.model("AdminLoginLog", adminLoginLogSchema);

export default AdminLoginLog;
