import mongoose from "mongoose";

const facebookPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },
    pageId: {
      type: String,
      required: true,
      unique: true
    },
    pageName: {
      type: String,
      required: true
    },
    pageAccessToken: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const FacebookPage = mongoose.model("FacebookPage", facebookPageSchema);
export default FacebookPage;
