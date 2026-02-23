import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    image: {
      type: String,
      default: "/images/default-product.png"
    },

    // ✅ Proper Category Reference (instead of String)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    description: {
      type: String,
      trim: true
    },

    brand: {
      type: String,
      trim: true,
      index: true
    },

    specs: {
      type: Object
    },


    // ✅ Rating for ranking
    rating: {
      type: Number,
      default: 0
    },

    reviewCount: {
      type: Number,
      default: 0
    },

    // ✅ Tags (help search boosting)
    tags: {
      type: [String],
      default: []
    },

    howManyProductsSold: {
      type: Number,
      default: 0
    },

    // 🔥 AI Embedding Field (VERY IMPORTANT)
    embedding: {
      type: [Number],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/* ✅ TEXT INDEX (FOR BASIC SEARCH) */
productSchema.index({
  productName: "text",
  description: "text",
  brand: "text",
  tags: "text"
});

const productModel = mongoose.model("Product", productSchema);

export default productModel;