import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true
    },

    productName: {
      type: String,
      required: true
    },

    image: {
      type: String,
      default: "/images/default-profile.png"
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    warranty: {
      type: String,
      default: "No warranty"
    },

    howManyproductsSold: {
      type: Number,
      default: 0
    },

    sellerName: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

/* ✅ TEXT INDEX (INVERTED INDEX) */
productSchema.index({
  productName: "text",
  sellerName: "text",
  category: "text",
  warranty: "text"
});

const productModel = mongoose.model("product", productSchema);
export default productModel;
