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
