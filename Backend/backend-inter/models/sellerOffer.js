import mongoose from "mongoose";

const sellerOfferSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    sellerName: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    stock: {
      type: Number,
      required: true
    },

    warranty: {
      type: String,
      default: "No warranty"
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

sellerOfferSchema.index({
  sellerName: "text",
  warranty: "text"
});

const sellerOfferModel = mongoose.model("SellerOffer", sellerOfferSchema);
export default sellerOfferModel;
