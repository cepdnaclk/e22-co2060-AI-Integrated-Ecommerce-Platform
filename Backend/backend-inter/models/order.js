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
 * Shipping Address Schema (Embedded)
 */
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    deliveryInstructions: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    placeId: { type: String, default: "" },
    provider: { type: String, default: "" },
    accuracy: { type: Number, default: null },
    timestamp: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    formattedAddress: { type: String, default: "" },
    verified: { type: Boolean, default: false }
  },
  { _id: false }
);

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

    // 📦 Shipping address
    shippingAddress: {
      type: shippingAddressSchema,
      required: false
    },

    // 📌 Order status lifecycle
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending"
    },

    // 🧾 Seller fulfillment proof + verification + QR metadata
    sellerQr: {
      verificationStatus: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted"
      },
      proofImageUrl: {
        type: String,
        default: ""
      },
      packingProductName: {
        type: String,
        default: ""
      },
      packingSkuOrImei: {
        type: String,
        default: ""
      },
      proofSubmittedAt: {
        type: Date,
        default: null
      },
      proofSubmittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      verificationNote: {
        type: String,
        default: ""
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      verifiedAt: {
        type: Date,
        default: null
      },
      qrPayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      qrGeneratedAt: {
        type: Date,
        default: null
      }
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
