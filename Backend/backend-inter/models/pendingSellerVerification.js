import mongoose from "mongoose";

/**
 * Temporary store for seller registrations awaiting email verification.
 * Documents auto-expire after 1 hour via MongoDB TTL index.
 */
const pendingSellerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    email: { type: String, required: true },
    shopName: { type: String, required: true },
    description: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    verificationToken: { type: String, required: true, unique: true },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        index: { expires: 0 }, // MongoDB TTL — auto-delete after expiresAt
    },
});

export default mongoose.model("PendingSellerVerification", pendingSellerSchema);
