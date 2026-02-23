import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      unique: true
    },

    availableStock: {
      type: Number,
      required: true,
      default: 0
    },

    reservedStock: {
      type: Number,
      default: 0
    },

    lowStockThreshold: {
      type: Number,
      default: 5
    }
  },
  {
    timestamps: true
  }
);

const inventoryModel = mongoose.model("Inventory", inventorySchema);

export default inventoryModel;