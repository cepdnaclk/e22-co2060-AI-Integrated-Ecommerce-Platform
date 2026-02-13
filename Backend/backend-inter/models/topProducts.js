import mongoose from "mongoose";

const topProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  rank: Number,
  score: Number,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("TopProduct", topProductSchema);
