import mongoose from "mongoose";

const facebookPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    pageId: {
      type: String,
      required: true
    },
    pageName: {
      type: String,
      required: true
    },
    pageAccessToken: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

facebookPageSchema.index({ userId: 1, pageId: 1 }, { unique: true });

const facebookPageModel = mongoose.model("FacebookPage", facebookPageSchema);

export default facebookPageModel;
