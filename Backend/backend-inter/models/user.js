import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },

    firstName: {
      type: String,
      required: true
    },

    lastName: {
      type: String,
      trim: true,
      default: ""
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      required: true,
      enum: ["customer", "seller", "admin", "ceo"],
      default: "customer"
    },

    isBlocked: {
      type: Boolean,
      default: false,
      required: true
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
      required: true
    },

    image: {
      type: String,
      default: "/images/default-profile.png"
    },

    phone: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    address: { type: String, default: "" },
    addressLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeId: { type: String, default: "" },
      provider: { type: String, default: "" },
      accuracy: { type: Number, default: null },
      timestamp: { type: String, default: "" },
      country: { type: String, default: "" },
      state: { type: String, default: "" },
      city: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      street: { type: String, default: "" },
      formattedAddress: { type: String, default: "" },
      verified: { type: Boolean, default: false },
    },
    bio: { type: String, default: "" },

    token: {
      type: String,
      default: null
    },

    // Face recognition embedding (admin only, nullable)
    faceEmbedding: {
      type: [Number],
      default: null,
    }
  },
  { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
