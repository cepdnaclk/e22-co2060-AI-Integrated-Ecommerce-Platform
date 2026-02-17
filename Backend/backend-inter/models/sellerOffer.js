import mongoose from "mongoose";

const sellerOfferSchema = new mongoose.Schema(
  {
    /* 🔗 Product being sold */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    /* 🏪 Seller business (NOT User) */
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller", // ✅ FIXED
      required: true,
    },

    /* 🏷️ Cached seller name */
    sellerName: {
      type: String,
      required: true,
    },

    /* 💰 Price set by seller */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /* 📦 Available stock */
    stock: {
      type: Number,
      required: true,
      min: 0,
    },

    /* 🛡️ Warranty info */
    warranty: {
      type: String,
      default: "No warranty",
    },

    /* ⏸️ Seller can pause selling */
    isActive: {
      type: Boolean,
      default: true,
    },
    

    discountPercentage: {
      type: Number,
      default: 0,
    },

    deliveryOptions: {
      type: [String], // e.g. ["Standard", "Express"]
      default: ["Standard"],
    },
  },
  {
    timestamps: true,
  },
);

/* 🔍 Indexes for performance */
sellerOfferSchema.index({ productId: 1, sellerId: 1 });
sellerOfferSchema.index({ sellerName: "text", warranty: "text" });

const sellerOfferModel = mongoose.model("SellerOffer", sellerOfferSchema);

export default sellerOfferModel;
