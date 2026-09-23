import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/products.js";
import { enqueueProductFacebookPost } from "../queues/facebookPostQueue.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";
const TARGET_PRODUCT_ID = "6ab006889863c1ae62b989c0";

async function runRetryTest() {
  console.log("==================================================");
  console.log("VERIFYING AND RETRYING EXISTING TEST PRODUCT");
  console.log("==================================================");

  console.log("\n🔌 Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected.");

  try {
    // --------------------------------------------------
    // STEP 5: VERIFY EXISTING PRODUCT
    // --------------------------------------------------
    console.log(`\n🔍 STEP 5: Fetching Product ${TARGET_PRODUCT_ID}...`);
    const product = await Product.findById(TARGET_PRODUCT_ID);

    if (!product) {
      throw new Error(`Product ${TARGET_PRODUCT_ID} not found in database!`);
    }

    console.log(`✅ Product Found: ${product.productName}`);
    console.log(`   approvalStatus: ${product.approvalStatus}`);
    console.log(`   facebookStatus: ${product.facebookStatus}`);
    console.log(`   previous error: ${product.facebookError || "None"}`);

    // STEP 14: DUPLICATE POST PROTECTION
    if (product.facebookStatus === "published") {
      console.log("⚠️ Product is ALREADY PUBLISHED on Facebook! Aborting retry to prevent duplicate posts.");
      return;
    }

    if (product.approvalStatus !== "approved") {
      throw new Error(`Product approvalStatus is '${product.approvalStatus}', expected 'approved'.`);
    }

    // --------------------------------------------------
    // STEP 6: RETRY THROUGH ADMIN WORKFLOW LOGIC
    // --------------------------------------------------
    console.log("\n🔄 STEP 6: Executing Admin Retry Workflow...");
    product.facebookStatus = "queued";
    product.facebookError = null;
    await product.save();

    await enqueueProductFacebookPost(product._id.toString());
    console.log("✅ Facebook retry job enqueued in BullMQ.");

    // --------------------------------------------------
    // STEP 7, 8, 9, 10, 11: MONITOR WORKER EXECUTION
    // --------------------------------------------------
    console.log("\n⏳ STEP 7-11: Monitoring Worker Processing...");
    let pollCount = 0;
    let finalProduct = null;

    while (pollCount < 30) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      pollCount++;
      finalProduct = await Product.findById(TARGET_PRODUCT_ID);
      console.log(`   [Poll ${pollCount}] Status: ${finalProduct.facebookStatus}`);

      if (finalProduct.facebookStatus === "published" || finalProduct.facebookStatus === "failed") {
        break;
      }
    }

    console.log("\n==================================================");
    console.log("FINAL RETRY RESULT SUMMARY");
    console.log("==================================================");
    console.log(`Product ID: ${finalProduct._id}`);
    console.log(`approvalStatus: ${finalProduct.approvalStatus}`);
    console.log(`facebookStatus: ${finalProduct.facebookStatus}`);
    console.log(`facebookPostId: ${finalProduct.facebookPostId || "N/A"}`);
    console.log(`facebookPublishedAt: ${finalProduct.facebookPublishedAt || "N/A"}`);
    console.log(`facebookCaption generated: ${finalProduct.facebookCaption ? "YES" : "NO"}`);
    if (finalProduct.facebookCaption) {
      console.log(`\n--- Generated Caption ---\n${finalProduct.facebookCaption}\n-------------------------`);
    }
    if (finalProduct.facebookError) {
      console.log(`facebookError: ${finalProduct.facebookError}`);
    }

  } catch (error) {
    console.error("❌ Retry Test Error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB Disconnected.");
  }
}

runRetryTest();
