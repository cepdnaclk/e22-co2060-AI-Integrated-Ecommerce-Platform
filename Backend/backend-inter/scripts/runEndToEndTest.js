import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/products.js";
import SellerOffer from "../models/sellerOffer.js";
import { enqueueProductFacebookPost } from "../queues/facebookPostQueue.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecommerce";

async function runTest() {
  console.log("==================================================");
  console.log("STARTING END-TO-END AUTOMATIC FACEBOOK POST TEST");
  console.log("==================================================");

  console.log("\n🔌 Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB Connected.");

  let createdProduct = null;
  let createdOffer = null;

  try {
    // --------------------------------------------------
    // STEP 4: CREATE ONE TEST PRODUCT
    // --------------------------------------------------
    console.log("\n📝 STEP 4: Creating Test Product...");
    createdProduct = await Product.create({
      productName: "Samsung Galaxy S25 Ultra",
      category: "Mobile Phones",
      description: "Samsung Galaxy S25 Ultra with premium design, advanced camera system and powerful performance.",
      image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf",
      approvalStatus: "pending",
      facebookStatus: "not_posted"
    });

    createdOffer = await SellerOffer.create({
      productId: createdProduct._id,
      sellerId: new mongoose.Types.ObjectId(),
      sellerName: "BEETA Tech Store",
      stock: 10,
      price: 450000,
      isActive: true
    });

    console.log(`✅ Test Product Created: ${createdProduct._id}`);
    console.log(`   Product Name: ${createdProduct.productName}`);
    console.log(`   approvalStatus: ${createdProduct.approvalStatus}`);
    console.log(`   facebookStatus: ${createdProduct.facebookStatus}`);

    if (createdProduct.approvalStatus !== "pending" || createdProduct.facebookStatus !== "not_posted") {
      throw new Error("Initial status verification failed!");
    }

    // --------------------------------------------------
    // STEP 5 & 6: ADMIN APPROVAL & QUEUE
    // --------------------------------------------------
    console.log("\n👍 STEP 5 & 6: Approving Product and Enqueueing Job...");
    createdProduct.approvalStatus = "approved";
    createdProduct.facebookStatus = "queued";
    createdProduct.facebookError = null;
    await createdProduct.save();

    await enqueueProductFacebookPost(createdProduct._id.toString());
    console.log(`✅ Product status updated to approved & queued in BullMQ.`);

    // --------------------------------------------------
    // STEP 7 & 8: WORKER PROCESSING WAITING
    // --------------------------------------------------
    console.log("\n⏳ STEP 7 & 8: Waiting for Facebook Worker to process job...");
    let pollCount = 0;
    let finalProduct = null;

    while (pollCount < 20) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      pollCount++;
      finalProduct = await Product.findById(createdProduct._id);
      console.log(`   [Poll ${pollCount}] Current facebookStatus: ${finalProduct.facebookStatus}`);

      if (finalProduct.facebookStatus === "published" || finalProduct.facebookStatus === "failed") {
        break;
      }
    }

    console.log("\n==================================================");
    console.log("FINAL RESULT SUMMARY");
    console.log("==================================================");
    console.log(`Product ID: ${finalProduct._id}`);
    console.log(`approvalStatus: ${finalProduct.approvalStatus}`);
    console.log(`facebookStatus: ${finalProduct.facebookStatus}`);
    console.log(`facebookPostId: ${finalProduct.facebookPostId || "N/A"}`);
    console.log(`facebookPublishedAt: ${finalProduct.facebookPublishedAt || "N/A"}`);
    console.log(`facebookCaption generated: ${finalProduct.facebookCaption ? "YES" : "NO"}`);
    if (finalProduct.facebookCaption) {
      console.log(`--- Generated Caption ---\n${finalProduct.facebookCaption}\n-------------------------`);
    }
    if (finalProduct.facebookError) {
      console.log(`facebookError: ${finalProduct.facebookError}`);
    }

  } catch (error) {
    console.error("❌ Test Error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB Disconnected.");
  }
}

runTest();
