import mongoose from "mongoose";

/**
 * ======================================================
 * ORDER MODEL
 * ======================================================
 * Purpose:
 * - Permanent record of a checkout
 * - ONE order belongs to ONE seller
 * - Buyer checkout can create MULTIPLE orders
 * ======================================================
 */

/**
 * Order Item Schema
 */
const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    sellerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerOffer",
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

/**
 * Main Order Schema
 */
const orderSchema = new mongoose.Schema(
  {
    // 👤 Buyer
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // 🏪 Seller (ONE seller per order)
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true
    },

    // 📦 Items for this seller
    items: {
      type: [orderItemSchema],
      required: true
    },

    // 💰 Total price for THIS seller
    totalAmount: {
      type: Number,
      required: true
    },

    // 📌 Order status lifecycle
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

/**
 * Indexes
 */
orderSchema.index({ userId: 1 });
orderSchema.index({ sellerId: 1 });

const orderModel = mongoose.model("Order", orderSchema);

export default orderModel;
