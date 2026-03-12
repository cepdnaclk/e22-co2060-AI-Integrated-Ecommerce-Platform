/**
 * ======================================================
 * ADMIN USER SETUP SCRIPT
 * Run this script to create an admin user for the system
 * 
 * Usage: node scripts/createAdmin.js
 * ======================================================
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAIL = "admin@icomputers.com";
const ADMIN_PASSWORD = "Admin@123";  // Change this!
const ADMIN_FIRST_NAME = "System";
const ADMIN_LAST_NAME = "Admin";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, default: "" },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
  isBlocked: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  image: { type: String, default: "/images/default-profile.png" },
  phone: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  gender: { type: String, default: "" },
  address: { type: String, default: "" },
  bio: { type: String, default: "" },
  token: { type: String, default: null }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    const mongoURI = process.env.MONGO_URI || 
      "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";
    
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log("ℹ️  Admin user already exists:", ADMIN_EMAIL);
        
        // Update password if needed
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        await User.updateOne(
          { email: ADMIN_EMAIL },
          { $set: { password: hashedPassword } }
        );
        console.log("✅ Admin password updated");
      } else {
        // Upgrade existing user to admin
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        await User.updateOne(
          { email: ADMIN_EMAIL },
          { $set: { role: "admin", password: hashedPassword, isEmailVerified: true } }
        );
        console.log("✅ User upgraded to admin:", ADMIN_EMAIL);
      }
    } else {
      // Create new admin
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        role: "admin",
        isEmailVerified: true,
        isBlocked: false
      });

      console.log("✅ Admin user created successfully!");
    }

    console.log("\n========================================");
    console.log("📧 Admin Email:", ADMIN_EMAIL);
    console.log("🔐 Admin Password:", ADMIN_PASSWORD);
    console.log("🌐 Admin Login URL: http://localhost:5173/admin/login");
    console.log("========================================\n");

    console.log("⚠️  IMPORTANT: Change the default password after first login!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

createAdmin();
