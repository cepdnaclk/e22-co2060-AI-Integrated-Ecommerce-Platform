import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAccount(email) {
  if (!email) {
    console.error("❌ Please provide an email address.");
    process.exit(1);
  }

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  console.log("Connecting to:", mongoURI);
  
  try {
    await mongoose.connect(mongoURI);
    
    // 1. Find the User
    const User = mongoose.model("User", new mongoose.Schema({
      email: String,
      role: String,
      firstName: String
    }));

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found.`);
      return;
    }

    // 2. Update Role to Seller
    user.role = "seller";
    await user.save();
    console.log(`✅ User ${email} promoted to 'seller'.`);

    // 3. Create Seller Profile
    const Seller = mongoose.model("Seller", new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      shopName: String,
      verificationStatus: String,
      isActive: Boolean
    }));

    const existingSeller = await Seller.findOne({ userId: user._id });
    if (!existingSeller) {
      await Seller.create({
        userId: user._id,
        shopName: `${user.firstName}'s Shop`,
        verificationStatus: "approved",
        isActive: true
      });
      console.log(`✅ Created approved Seller profile for ${user.firstName}.`);
    } else {
      console.log(`ℹ️ Seller profile already exists.`);
    }

    console.log("\n🚀 Done!");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

const targetEmail = process.argv[2];
fixAccount(targetEmail);
