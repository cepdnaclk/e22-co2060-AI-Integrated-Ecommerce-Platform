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
      enum: ["customer", "seller", "admin"], // ✅ seller added
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
    bio: { type: String, default: "" },

    token: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);

export default userModel;
