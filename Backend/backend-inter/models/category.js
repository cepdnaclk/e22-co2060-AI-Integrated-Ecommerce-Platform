import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    seoTitle: {
      type: String,
      trim: true
    },

    seoDescription: {
      type: String,
      trim: true
    },

    keywords: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const categoryModel = mongoose.model("Category", categorySchema);

export default categoryModel;