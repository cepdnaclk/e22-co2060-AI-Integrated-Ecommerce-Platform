import mongoose from "mongoose";

const facebookAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    accessToken: {
      type: String,
      required: true
    },
    tokenExpiry: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

const facebookAccountModel = mongoose.model("FacebookAccount", facebookAccountSchema);

export default facebookAccountModel;
