import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    sellerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerOffer",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["restock", "sale", "adjustment", "return", "damaged", "initial"],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true, // positive = added, negative = removed
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ createdAt: -1 });

const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);

export default InventoryLog;
