import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    // Unique SKU for each configuration
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // Variant attributes (flexible structure)
    attributes: {
      type: Map,
      of: String,
      required: true
    },

    // Optional variant-specific image
    image: {
      type: String
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/* Prevent duplicate variants for same product */
productVariantSchema.index(
  { product: 1, sku: 1 },
  { unique: true }
);

const productVariantModel = mongoose.model(
  "ProductVariant",
  productVariantSchema
);

export default productVariantModel;