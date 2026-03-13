/**
 * ======================================================
 * CEO ACCOUNT SETUP SCRIPT
 * Run this script to create the CEO (super admin) user.
 * Only ONE CEO account should exist in the system.
 * 
 * Usage: node scripts/createAdmin.js
 * ======================================================
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const CEO_EMAIL = "admin@icomputers.com";
const CEO_PASSWORD = "Admin@123";  // Change this!
const CEO_FIRST_NAME = "System";
const CEO_LAST_NAME = "CEO";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, default: "" },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "seller", "admin", "ceo"], default: "customer" },
  isBlocked: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  image: { type: String, default: "/images/default-profile.png" },
  phone: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  gender: { type: String, default: "" },
  address: { type: String, default: "" },
  bio: { type: String, default: "" },
  token: { type: String, default: null },
  faceEmbedding: { type: [Number], default: null },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

async function createCEO() {
  try {
    const mongoURI = process.env.MONGO_URI || 
      "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";
    
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Check if CEO already exists
    const existingCEO = await User.findOne({ role: "ceo" });
    
    if (existingCEO) {
      console.log("ℹ️  CEO account already exists:", existingCEO.email);
      
      // Update password if needed
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(CEO_PASSWORD, salt);
      await User.updateOne(
        { _id: existingCEO._id },
        { $set: { password: hashedPassword } }
      );
      console.log("✅ CEO password updated");
    } else {
      // Check if email exists with different role — upgrade to CEO
      const existingUser = await User.findOne({ email: CEO_EMAIL });
      
      if (existingUser) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(CEO_PASSWORD, salt);
        await User.updateOne(
          { email: CEO_EMAIL },
          { $set: { role: "ceo", password: hashedPassword, isEmailVerified: true } }
        );
        console.log("✅ Existing user upgraded to CEO:", CEO_EMAIL);
      } else {
        // Create new CEO
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(CEO_PASSWORD, salt);

        await User.create({
          email: CEO_EMAIL,
          password: hashedPassword,
          firstName: CEO_FIRST_NAME,
          lastName: CEO_LAST_NAME,
          role: "ceo",
          isEmailVerified: true,
          isBlocked: false
        });

        console.log("✅ CEO account created successfully!");
      }
    }

    console.log("\n========================================");
    console.log("👑 CEO Email:", CEO_EMAIL);
    console.log("🔐 CEO Password:", CEO_PASSWORD);
    console.log("🌐 Admin Login URL: http://localhost:5173/admin/login");
    console.log("========================================\n");

    console.log("⚠️  IMPORTANT: Change the default password after first login!");
    console.log("ℹ️  The CEO can create admin accounts from the Face Management page.");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

createCEO();
