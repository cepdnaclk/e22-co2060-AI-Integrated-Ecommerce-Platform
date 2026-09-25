import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      index: true
    },

    image: {
      type: String,
      default: "/images/default-product.png"
    },

    category: {
      type: String,
      required: true,
      index: true
    },

    description: {
      type: String
    },

    brand: {
      type: String
    },

    specs: {
      type: Object
    },

    howManyProductsSold: {
      type: Number,
      default: 0
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    facebookStatus: {
      type: String,
      enum: ["not_posted", "queued", "processing", "published", "failed"],
      default: "not_posted"
    },

    facebookPostId: {
      type: String,
      default: null
    },

    facebookError: {
      type: String,
      default: null
    },

    facebookPublishedAt: {
      type: Date,
      default: null
    },

    facebookCaption: {
      type: String,
      default: null
    },

    /* 🧠 RAG & Vector Search Metadata Fields */
    embedding: {
      type: [Number],
      default: undefined
    },

    minPrice: {
      type: Number,
      default: null
    },

    maxPrice: {
      type: Number,
      default: null
    },

    totalStock: {
      type: Number,
      default: 0
    },

    hasActiveOffers: {
      type: Boolean,
      default: false
    },

    embeddingUpdatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/* ✅ TEXT INDEX (FOR SEARCH) */
productSchema.index({
  productName: "text",
  category: "text",
  brand: "text",
  description: "text"
});

const productModel = mongoose.model("Product", productSchema);
export default productModel;
