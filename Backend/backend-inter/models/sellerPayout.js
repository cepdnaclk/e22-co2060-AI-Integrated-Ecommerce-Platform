import mongoose from "mongoose";

const sellerPayoutSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
      }
    ],
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "LKR"
    },
    status: {
      type: String,
      enum: [
        "PENDING_ELIGIBILITY",
        "ELIGIBLE",
        "BATCHED",
        "PROCESSING",
        "PAID",
        "FAILED",
        "RETRY_PENDING"
      ],
      default: "BATCHED"
    },
    eligibleAt: { type: Date, default: null },
    batchedAt: { type: Date, default: null },
    processingAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    bankTransferReference: { type: String, default: null },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

const sellerPayoutModel = mongoose.model("SellerPayout", sellerPayoutSchema);

export default sellerPayoutModel;
