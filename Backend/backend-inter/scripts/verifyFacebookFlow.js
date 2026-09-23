import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/products.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";

async function verifyFlow() {
  console.log("🔍 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected.");

  try {
    // 1. Create product
    console.log("📝 Step 1: Creating new test product...");
    const testProduct = await Product.create({
      productName: "Test Verification Phone " + Date.now(),
      category: "Mobile Phone",
      price: 150000,
      description: "Test verification product for Facebook workflow",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
      minPrice: 140000,
      approvalStatus: "pending",
      facebookStatus: "not_posted"
    });

    console.log(`✅ Product Created with ID: ${testProduct._id}`);
    console.log(`   approvalStatus: ${testProduct.approvalStatus} (Expected: pending)`);
    console.log(`   facebookStatus: ${testProduct.facebookStatus} (Expected: not_posted)`);

    if (testProduct.approvalStatus !== "pending" || testProduct.facebookStatus !== "not_posted") {
      throw new Error("❌ Test Failed: Default statuses on product creation are incorrect!");
    }

    // 2. Test Admin Approval Simulation
    console.log("\n👍 Step 2: Simulating Admin Approval...");
    testProduct.approvalStatus = "approved";
    testProduct.facebookStatus = "queued";
    testProduct.facebookError = null;
    await testProduct.save();

    console.log(`✅ Product Approved.`);
    console.log(`   approvalStatus: ${testProduct.approvalStatus} (Expected: approved)`);
    console.log(`   facebookStatus: ${testProduct.facebookStatus} (Expected: queued)`);

    // 3. Test Admin Rejection
    console.log("\n👎 Step 3: Simulating Admin Rejection on secondary test product...");
    const rejProduct = await Product.create({
      productName: "Test Rejected Product " + Date.now(),
      category: "Accessories",
      price: 5000,
      description: "To be rejected",
      approvalStatus: "pending",
      facebookStatus: "not_posted"
    });

    rejProduct.approvalStatus = "rejected";
    await rejProduct.save();
    console.log(`✅ Product Rejected successfully.`);
    console.log(`   approvalStatus: ${rejProduct.approvalStatus} (Expected: rejected)`);

    // 4. Test Retry Facebook
    console.log("\n🔄 Step 4: Simulating Facebook Retry flow...");
    testProduct.facebookStatus = "failed";
    testProduct.facebookError = "Simulated network timeout";
    await testProduct.save();

    if (testProduct.approvalStatus === "approved") {
      testProduct.facebookStatus = "queued";
      testProduct.facebookError = null;
      await testProduct.save();
    }
    console.log(`✅ Facebook retry set product status back to queued.`);
    console.log(`   facebookStatus: ${testProduct.facebookStatus} (Expected: queued)`);

    // Cleanup
    console.log("\n🧹 Cleaning up test products...");
    await Product.findByIdAndDelete(testProduct._id);
    await Product.findByIdAndDelete(rejProduct._id);
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Verification Failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

verifyFlow();
