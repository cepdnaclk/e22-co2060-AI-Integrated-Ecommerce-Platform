import mongoose from "mongoose";

const facebookPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    pageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacebookPage",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    linkUrl: {
      type: String,
      default: null
    },
    imageUrl: {
      type: String,
      default: null
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending"
    },
    publishedAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    graphPostId: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

facebookPostSchema.index({ userId: 1, scheduledAt: -1 });

const facebookPostModel = mongoose.model("FacebookPost", facebookPostSchema);

export default facebookPostModel;
