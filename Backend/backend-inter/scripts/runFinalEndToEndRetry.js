import axios from "axios";
import mongoose from "mongoose";
import "dotenv/config";
import Product from "../models/products.js";
import { enqueueProductFacebookPost } from "../queues/facebookPostQueue.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";
const TARGET_PRODUCT_ID = "6ab006889863c1ae62b989c0";
const GRAPH_BASE = "https://graph.facebook.com/v26.0";

async function runFinalRetry() {
  console.log("==================================================");
  console.log("FINAL REAL END-TO-END FACEBOOK PRODUCT POST RETRY");
  console.log("==================================================");

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error("❌ FACEBOOK_PAGE_ACCESS_TOKEN is missing in .env");
    process.exit(1);
  }

  // 1. Verify token via /debug_token
  console.log("\n1️⃣ Verifying FACEBOOK_PAGE_ACCESS_TOKEN via /debug_token...");
  try {
    const { data } = await axios.get(`${GRAPH_BASE}/debug_token`, {
      params: { input_token: token, access_token: token }
    });
    const info = data.data || {};
    console.log("   is_valid:", info.is_valid);
    console.log("   type:", info.type);
    console.log("   app_id:", info.app_id);

    if (!info.is_valid) {
      console.error("❌ STOPPING: Token is invalid or expired!");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ /debug_token check failed:", err.response?.data?.error?.message || err.message);
    process.exit(1);
  }

  // 2. Connect DB & Verify Product
  console.log("\n2️⃣ Connecting to MongoDB and verifying product...");
  await mongoose.connect(MONGO_URI);
  const product = await Product.findById(TARGET_PRODUCT_ID);

  if (!product) {
    console.error(`❌ Product ${TARGET_PRODUCT_ID} not found!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Product Found: ${product.productName}`);
  console.log(`   approvalStatus: ${product.approvalStatus}`);
  console.log(`   facebookStatus: ${product.facebookStatus}`);

  if (product.approvalStatus !== "approved") {
    console.error(`❌ Product approvalStatus is '${product.approvalStatus}', expected 'approved'.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3. Reset and enqueue BullMQ job
  console.log("\n3️⃣ Enqueueing job via BullMQ retry mechanism...");
  product.facebookStatus = "queued";
  product.facebookError = null;
  await product.save();

  await enqueueProductFacebookPost(product._id.toString());
  console.log("✅ Job enqueued in BullMQ.");

  // 4. Poll and monitor background worker
  console.log("\n4️⃣ Monitoring background worker execution...");
  let pollCount = 0;
  let finalProduct = null;

  while (pollCount < 30) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    pollCount++;
    finalProduct = await Product.findById(TARGET_PRODUCT_ID);
    console.log(`   [Poll ${pollCount}] status: ${finalProduct.facebookStatus}`);

    if (finalProduct.facebookStatus === "published" || finalProduct.facebookStatus === "failed") {
      break;
    }
  }

  console.log("\n==================================================");
  console.log("FINAL EXECUTION REPORT");
  console.log("==================================================");
  console.log(`Product ID: ${finalProduct._id}`);
  console.log(`approvalStatus: ${finalProduct.approvalStatus}`);
  console.log(`facebookStatus: ${finalProduct.facebookStatus}`);
  console.log(`Gemini Caption Generated: ${finalProduct.facebookCaption ? "YES" : "NO"}`);
  console.log(`Facebook Post ID: ${finalProduct.facebookPostId || "N/A"}`);
  console.log(`facebookPublishedAt: ${finalProduct.facebookPublishedAt || "N/A"}`);
  console.log(`Meta /photos Succeeded: ${finalProduct.facebookStatus === "published" ? "YES" : "NO"}`);
  if (finalProduct.facebookError) {
    console.log(`facebookError: ${finalProduct.facebookError}`);
  }

  await mongoose.disconnect();
  console.log("🔌 MongoDB Disconnected.");
}

runFinalRetry();
