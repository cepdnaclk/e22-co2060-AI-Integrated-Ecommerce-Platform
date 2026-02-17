import mongoose from "mongoose";

/**
 * Seller = Business profile for a user with role "seller"
 * One User → One Seller
 * One Seller → Many SellerOffers
 */

const sellerSchema = new mongoose.Schema(
  {
    // 🔗 Link to authenticated user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // 🏪 Seller business name
    shopName: {
      type: String,
      required: true,
      trim: true
    },

    // 📝 Optional description
    description: {
      type: String,
      trim: true
    },

    // ⭐ Seller rating (calculated later)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    // 🧮 Total number of reviews
    totalReviews: {
      type: Number,
      default: 0
    },

    // 🔐 Seller verification workflow (NEW)
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    // 📍 Business address
    address: {
      type: String,
      trim: true
    },

    // 📞 Contact number
    phone: {
      type: String,
      trim: true
    },

    // 🚫 Soft delete / suspension
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/* 🔍 Indexes for faster lookup */
sellerSchema.index({ shopName: "text" });

const sellerModel = mongoose.model("Seller", sellerSchema);

export default sellerModel;
