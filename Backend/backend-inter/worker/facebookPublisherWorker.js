import dotenv from "dotenv";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import FacebookPost from "../models/facebookPost.js";
import FacebookPage from "../models/facebookPage.js";
import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import redisConnection from "../queues/redisConnection.js";
import { decryptToken } from "../services/tokenCryptoService.js";
import { publishToPage, publishProductToFacebookPage } from "../services/facebookService.js";
import { generateFacebookCaption } from "../services/facebookCaptionService.js";

dotenv.config();

const mongoURI =
  process.env.MONGO_URI ||
  "mongodb://mongodb:27017/ecommerce";

if (mongoose.connection.readyState === 0) {
  await mongoose.connect(mongoURI);
}

const worker = new Worker(
  "facebook-scheduled-posts",
  async (job) => {
    // ──────────────────────────────────────────────────
    // BRANCH A: PRODUCT AUTOMATIC FACEBOOK POSTING
    // ──────────────────────────────────────────────────
    if (job.data && job.data.type === "product_auto_post") {
      const { productId } = job.data;
      const product = await productModel.findById(productId);
      if (!product) throw new Error(`Product ${productId} not found`);

      if (product.approvalStatus !== "approved") {
        console.warn(`⚠️ Skipping Facebook post: Product ${productId} is not approved (${product.approvalStatus})`);
        return { skipped: true, reason: "not_approved" };
      }

      // Mark processing
      product.facebookStatus = "processing";
      await product.save();

      try {
        // Fetch active seller offer to get price
        const minOffer = await sellerOfferModel
          .find({ productId: product._id, isActive: true })
          .sort({ price: 1 })
          .limit(1);

        const price = minOffer[0]?.price || 0;

        // Generate dynamic caption via Gemini AI (reuse existing caption on retry if present)
        let caption = product.facebookCaption;
        if (!caption) {
          caption = await generateFacebookCaption({
            productName: product.productName,
            category: product.category,
            price: price > 0 ? price : "Contact for price",
            description: product.description || product.productName
          });
          product.facebookCaption = caption;
          await product.save();
        }

        // Publish to Facebook Page via Meta Graph API
        const response = await publishProductToFacebookPage({
          message: caption,
          imageUrl: product.image
        });

        // Mark published
        product.facebookStatus = "published";
        product.facebookPostId = response.id || null;
        product.facebookPublishedAt = new Date();
        product.facebookError = null;
        await product.save();

        console.log(`✅ Product Facebook Post Published! ID: ${response.id}`);
        return { success: true, postId: response.id };
      } catch (error) {
        console.error(`❌ Product Facebook Post Failed: ${error.message}`);
        product.facebookStatus = "failed";
        product.facebookError = error.message || "Failed to publish post to Facebook";
        await product.save();
        throw error;
      }
    }

    // ──────────────────────────────────────────────────
    // BRANCH B: MANUAL SCHEDULED FACEBOOK POSTING
    // ──────────────────────────────────────────────────
    const { postId } = job.data;
    const post = await FacebookPost.findById(postId);
    if (!post) throw new Error("Post not found");

    if (post.status === "published") {
      return { skipped: true };
    }

    const page = await FacebookPage.findById(post.pageRef);
    if (!page) throw new Error("Page not found");

    try {
      const response = await publishToPage({
        pageId: page.pageId,
        pageAccessToken: decryptToken(page.pageAccessToken),
        content: post.content,
        imageUrl: post.imageUrl || undefined,
        linkUrl: post.linkUrl || undefined
      });

      post.status = "published";
      post.publishedAt = new Date();
      post.graphPostId = response.id || null;
      post.errorMessage = null;
      await post.save();
      return { success: true };
    } catch (error) {
      if (job.attemptsMade + 1 >= 3) {
        post.status = "failed";
        post.errorMessage = error.message;
        await post.save();
      }
      throw error;
    }
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => {
  console.log(`✅ Facebook post job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Facebook post job failed: ${job?.id}`, err.message);
});

console.log("🚀 Facebook publisher worker started");
