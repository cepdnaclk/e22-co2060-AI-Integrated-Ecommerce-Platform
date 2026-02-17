import mongoose from "mongoose";

/**
 * ======================================================
 * Cart Model
 * ======================================================
 * Purpose:
 * - Store buyer cart items
 * - Each item is linked to a specific SellerOffer
 *
 * IMPORTANT:
 * - Same product can have multiple sellers
 * - Cart MUST lock sellerOfferId
 * ======================================================
 */

/**
 * Cart Item Schema (Embedded)
 */
const cartItemSchema = new mongoose.Schema(
  {
    // 🔗 Base product (for display only)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    // 🔴 CRITICAL: Selected seller's offer
    sellerOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerOffer",
      required: true
    },

    // 🔗 Seller who owns the offer
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true
    },

    // 💰 Price locked at time of adding to cart
    price: {
      type: Number,
      required: true,
      min: 0
    },

    // 📦 Quantity selected by buyer
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  },
  {
    _id: false // Cart items do not need separate IDs
  }
);

/**
 * Main Cart Schema
 */
const cartSchema = new mongoose.Schema(
  {
    // 🔗 Buyer (user)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // 🛒 Cart items
    items: {
      type: [cartItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/**
 * ======================================================
 * Indexes
 * ======================================================
 */

// One cart per user
cartSchema.index({ userId: 1 });

/**
 * ======================================================
 * Model Export
 * ======================================================
 */
const cartModel = mongoose.model("Cart", cartSchema);

export default cartModel;
