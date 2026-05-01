import dotenv from "dotenv";
import mongoose from "mongoose";
import { Worker } from "bullmq";
import FacebookPost from "../models/facebookPost.js";
import FacebookPage from "../models/facebookPage.js";
import redisConnection from "../queues/redisConnection.js";
import { decryptToken } from "../services/tokenCryptoService.js";
import { publishToPage } from "../services/facebookService.js";

dotenv.config();

const mongoURI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

await mongoose.connect(mongoURI);

const worker = new Worker(
  "facebook-scheduled-posts",
  async (job) => {
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
