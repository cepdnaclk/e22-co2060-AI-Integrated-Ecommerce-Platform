import mongoose from "mongoose";
import dotenv from "dotenv";
import productModel from "./models/products.js";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://mongodb:27017/ecommerce";

console.log("Connecting to Mongo URI:", uri.replace(/\/\/.*@/, "//****:****@"));

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log("✅ Connected to Mongo!");
    const count = await productModel.countDocuments();
    console.log("Total Products in DB:", count);
    const sample = await productModel.find().limit(3);
    console.log("Sample Products:", JSON.stringify(sample, null, 2));
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ DB Atlas Error:", err.message);
    console.log("🔄 Trying local Docker MongoDB fallback (mongodb://mongodb:27017/ecommerce)...");
    try {
      await mongoose.connect("mongodb://mongodb:27017/ecommerce", { serverSelectionTimeoutMS: 5000 });
      console.log("✅ Connected to Local Docker MongoDB!");
      const count = await productModel.countDocuments();
      console.log("Total Products in Local DB:", count);
      process.exit(0);
    } catch (localErr) {
      console.error("❌ Local DB Error:", localErr.message);
      process.exit(1);
    }
  });
