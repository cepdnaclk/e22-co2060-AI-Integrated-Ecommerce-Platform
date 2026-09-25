import mongoose from "mongoose";

const commissionPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Default Marketplace Commission"
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    isActive: {
      type: Boolean,
      default: true
    },

    effectiveFrom: {
      type: Date,
      default: Date.now
    },

    effectiveTo: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

commissionPolicySchema.index({ isActive: 1, effectiveFrom: -1 });

const CommissionPolicy = mongoose.model(
  "CommissionPolicy",
  commissionPolicySchema
);

export default CommissionPolicy;
