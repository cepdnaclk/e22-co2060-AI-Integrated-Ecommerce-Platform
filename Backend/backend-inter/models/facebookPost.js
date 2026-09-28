import mongoose from "mongoose";

const facebookPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },
    pageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FacebookPage",
      required: false,
      default: null
    },
    pageId: {
      type: String,
      default: null
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
      required: true,
      default: Date.now
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
    },
    // AI Metadata
    tone: {
      type: String,
      default: "hype"
    },
    campaignType: {
      type: String,
      default: "product_spotlight"
    },
    targetAudience: {
      type: String,
      default: null
    },
    isAutomated: {
      type: Boolean,
      default: true
    },
    // Verification & Quality Guardrails
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending_verification", "verified", "rejected", "auto_verified"],
      default: "auto_verified"
    },
    verificationScore: {
      type: Number,
      default: 100
    },
    verificationChecks: [
      {
        name: { type: String },
        passed: { type: Boolean },
        details: { type: String }
      }
    ],
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

facebookPostSchema.index({ scheduledAt: -1, status: 1 });

const FacebookPost = mongoose.model("FacebookPost", facebookPostSchema);
export default FacebookPost;
