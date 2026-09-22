import Product from "../models/products.js";
import FacebookPage from "../models/facebookPage.js";
import FacebookPost from "../models/facebookPost.js";
import { decryptToken } from "./tokenCryptoService.js";
import { publishToPage } from "./facebookService.js";
import { enqueueFacebookPost } from "../queues/facebookPostQueue.js";
import { generateMarketingCampaign } from "./automationService.js";

/**
 * Executes end-to-end automated Facebook post creation & publishing:
 * 1. Analyzes real-time trends and matches catalog products via LangChain agent.
 * 2. Fetches product details, image URL, and frontend shop link.
 * 3. Identifies the target Facebook Page (from database or environment).
 * 4. Publishes immediately or schedules into the BullMQ queue.
 * 5. Persists the post record in MongoDB.
 */
export async function executeAutomatedFacebookPost({
  userId = null,
  pageId = null,
  trendOverride = null,
  mode = "now", // "now" or "schedule"
  scheduledAt = null
} = {}) {
  console.log("🤖 Starting automated Facebook post pipeline...");

  // 1️⃣ Run LangChain Marketing Agent
  let campaignData;
  try {
    const result = await generateMarketingCampaign(trendOverride);
    campaignData = result?.campaign || result;
  } catch (err) {
    console.warn("⚠️ LangChain agent fallback for Facebook automation:", err.message);
    campaignData = {
      headline: "🔥 Trending Tech Spotlight at I-Computers!",
      matched_product_name: "Featured Tech Product",
      primary_trend_topic: trendOverride || "Trending Electronics",
      post_caption: "Upgrade your tech game with the latest high-performance gadgets. Available now at unbeatable prices!",
      hashtags: ["#IComputers", "#TechDeals", "#TrendingTech", "#Electronics"],
      call_to_action: "Shop now at I-Computers with fast 3-5 day delivery!",
      urgency_hook: "Special online promotional pricing for a limited time!"
    };
  }

  // 2️⃣ Resolve Product & Image
  let product = null;
  if (campaignData.matched_product_id) {
    try {
      product = await Product.findById(campaignData.matched_product_id);
    } catch {
      // Ignored if invalid ObjectId
    }
  }
  if (!product && campaignData.matched_product_name) {
    product = await Product.findOne({
      productName: { $regex: new RegExp(campaignData.matched_product_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const productLink = product ? `${frontendUrl}/products/${product._id}` : frontendUrl;
  
  let imageUrl = null;
  if (product && product.image && (product.image.startsWith("http://") || product.image.startsWith("https://"))) {
    imageUrl = product.image;
  }

  // 3️⃣ Construct Facebook Post Content
  const hashtags = Array.isArray(campaignData.hashtags) ? campaignData.hashtags.join(" ") : "";
  const postContent = `${campaignData.headline}

${campaignData.post_caption}

🔥 Why You'll Love It:
• Product: ${campaignData.matched_product_name}
• Trend: ${campaignData.primary_trend_topic}
• Special Offer: ${campaignData.urgency_hook}

👉 Get Yours Here: ${productLink}

${hashtags}
${campaignData.call_to_action}`.trim();

  // 4️⃣ Find Target Facebook Page
  let targetPage = null;
  let pageAccessToken = null;
  let resolvedPageId = pageId;

  if (resolvedPageId) {
    targetPage = await FacebookPage.findOne({ $or: [{ _id: resolvedPageId }, { pageId: resolvedPageId }] });
  }

  if (!targetPage && userId) {
    targetPage = await FacebookPage.findOne({ userId }).sort({ updatedAt: -1 });
  }

  if (!targetPage) {
    // Pick first available page in DB
    targetPage = await FacebookPage.findOne().sort({ updatedAt: -1 });
  }

  if (targetPage) {
    resolvedPageId = targetPage.pageId;
    try {
      pageAccessToken = decryptToken(targetPage.pageAccessToken);
    } catch (tokenErr) {
      console.error("❌ Failed to decrypt page access token:", tokenErr.message);
    }
  } else if (process.env.FB_PAGE_ACCESS_TOKEN && process.env.FB_DEFAULT_PAGE_ID) {
    resolvedPageId = process.env.FB_DEFAULT_PAGE_ID;
    pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  }

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();

  // 5️⃣ Prepare Post Document
  let savedPost = null;
  if (targetPage) {
    savedPost = await FacebookPost.create({
      userId: targetPage.userId,
      pageRef: targetPage._id,
      content: postContent,
      linkUrl: productLink,
      imageUrl,
      scheduledAt: scheduledDate,
      status: "pending"
    });
  }

  // 6️⃣ Execute Publishing or Scheduling
  if (!pageAccessToken || !resolvedPageId) {
    console.log("ℹ️  No Facebook Page connected or configured yet. Automated post generated in simulation/draft mode.");
    return {
      status: "draft",
      message: "Automated post successfully generated. Connect a Facebook page to enable live publishing.",
      post: savedPost,
      content: postContent,
      imageUrl,
      linkUrl: productLink,
      campaign: campaignData,
      facebookConfigured: false
    };
  }

  if (mode === "now") {
    try {
      console.log(`📡 Publishing automated post directly to Facebook Page ${resolvedPageId}...`);
      const graphResponse = await publishToPage({
        pageId: resolvedPageId,
        pageAccessToken,
        content: postContent,
        imageUrl: imageUrl || undefined,
        linkUrl: productLink
      });

      if (savedPost) {
        savedPost.status = "published";
        savedPost.publishedAt = new Date();
        savedPost.graphPostId = graphResponse?.id || null;
        await savedPost.save();
      }

      console.log("✅ Automated Facebook post published successfully:", graphResponse?.id);

      return {
        status: "published",
        message: "Automated post published to Facebook page successfully",
        graphPostId: graphResponse?.id,
        post: savedPost,
        content: postContent,
        imageUrl,
        linkUrl: productLink,
        campaign: campaignData,
        facebookConfigured: true
      };
    } catch (pubErr) {
      console.error("❌ Facebook direct publish error:", pubErr.message);
      if (savedPost) {
        savedPost.status = "failed";
        savedPost.errorMessage = pubErr.message;
        await savedPost.save();
      }
      throw new Error(`Facebook publishing failed: ${pubErr.message}`);
    }
  } else {
    // Schedule mode: queue delayed job in BullMQ
    if (savedPost) {
      await enqueueFacebookPost(savedPost);
    }

    console.log(`⏰ Automated Facebook post scheduled for ${scheduledDate.toISOString()}`);

    return {
      status: "scheduled",
      message: "Automated post queued in BullMQ scheduler",
      post: savedPost,
      scheduledAt: scheduledDate,
      content: postContent,
      imageUrl,
      linkUrl: productLink,
      campaign: campaignData,
      facebookConfigured: true
    };
  }
}
