import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import userModel from "../models/user.js";

dotenv.config();

const mongoURI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

async function run() {
  await mongoose.connect(mongoURI);

  const email = "user1@example.com";
  const rawPassword = "User@12345";
  const hashed = await bcrypt.hash(rawPassword, 10);

  const user = await userModel.findOneAndUpdate(
    { email },
    {
      email,
      firstName: "Demo",
      lastName: "User",
      password: hashed,
      role: "customer",
      isBlocked: false,
      isEmailVerified: true
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("✅ Seeded user:", user.email);
  console.log("🔐 Password:", rawPassword);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("❌ Seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
