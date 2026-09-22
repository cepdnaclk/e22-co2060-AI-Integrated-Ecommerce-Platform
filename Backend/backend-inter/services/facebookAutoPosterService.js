import Product from "../models/products.js";
import FacebookPage from "../models/facebookPage.js";
import FacebookPost from "../models/facebookPost.js";
import { decryptToken } from "./tokenCryptoService.js";
import { publishToPage } from "./facebookService.js";
import { enqueueFacebookPost } from "../queues/facebookPostQueue.js";
import { generateMarketingCampaign } from "./automationService.js";

/**
 * Calculates the next optimal engagement window (e.g., peak evening engagement at 19:00 / 7 PM).
 */
function calculateOptimalPostingTime() {
  const now = new Date();
  const optimal = new Date(now);
  optimal.setHours(19, 0, 0, 0); // 7:00 PM
  if (now.getTime() >= optimal.getTime()) {
    // If 7 PM passed today, schedule for tomorrow 7 PM
    optimal.setDate(optimal.getDate() + 1);
  }
  return optimal;
}

/**
 * Executes end-to-end automated Facebook post creation & publishing with rich options:
 * - Tone: hype, professional, storytelling, discount_driven, informative, humorous
 * - Campaign Type: product_spotlight, flash_sale, deal_of_the_day, trend_roundup, buying_guide
 * - Target Audience, Promo Code, Discount %, Language, Length
 * - Publish Mode: "now", "schedule", "optimal_time", "draft"
 */
export async function executeAutomatedFacebookPost({
  userId = null,
  pageId = null,
  trendOverride = null,
  customProductId = null,
  tone = "hype",
  campaignType = "product_spotlight",
  targetAudience = "tech enthusiasts & gamers",
  promoCode = null,
  discountPercent = null,
  language = "English",
  postLength = "medium",
  customImageUrl = null,
  mode = "now", // "now", "schedule", "optimal_time", "draft"
  scheduledAt = null
} = {}) {
  console.log(`🤖 Starting automated Facebook post pipeline [mode: ${mode}, tone: ${tone}, type: ${campaignType}]...`);

  // 1️⃣ Run LangChain Marketing Agent with options
  let campaignData;
  try {
    const result = await generateMarketingCampaign({
      trendOverride,
      customProductId,
      tone,
      campaignType,
      targetAudience,
      promoCode,
      discountPercent,
      language,
      postLength
    });
    campaignData = result?.campaign || result;
  } catch (err) {
    console.warn("⚠️ LangChain agent fallback for Facebook automation:", err.message);
    const discountText = promoCode ? ` Use code ${promoCode} for ${discountPercent || 10}% off!` : "";
    campaignData = {
      headline: "🔥 Trending Tech Spotlight at I-Computers!",
      matched_product_name: "Featured Tech Product",
      primary_trend_topic: trendOverride || "Trending Electronics",
      post_caption: `Upgrade your tech game with the latest high-performance gadgets.${discountText} Available now at unbeatable prices!`,
      key_features: ["Top tier performance", "Verified authenticity", "Official warranty"],
      hashtags: ["#IComputers", "#TechDeals", "#TrendingTech", "#Electronics"],
      call_to_action: "Shop now at I-Computers with fast 3-5 day delivery!",
      urgency_hook: `Special promotional pricing for a limited time!${discountText}`
    };
  }

  // 2️⃣ Resolve Product & Image
  let product = null;
  const targetId = customProductId || campaignData.matched_product_id;
  if (targetId) {
    try {
      product = await Product.findById(targetId);
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
  
  let imageUrl = customImageUrl || null;
  if (!imageUrl && product && product.image && (product.image.startsWith("http://") || product.image.startsWith("https://"))) {
    imageUrl = product.image;
  }

  // 3️⃣ Construct Facebook Post Content
  const hashtags = Array.isArray(campaignData.hashtags) ? campaignData.hashtags.join(" ") : "";
  const features = Array.isArray(campaignData.key_features) && campaignData.key_features.length > 0
    ? `\n✨ Key Highlights:\n${campaignData.key_features.map(f => `• ${f}`).join('\n')}\n`
    : "";

  const postContent = `${campaignData.headline}

${campaignData.post_caption}
${features}
🔥 Campaign Details:
• Product: ${campaignData.matched_product_name}
• Trend: ${campaignData.primary_trend_topic}
• Special: ${campaignData.urgency_hook}

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

  // Determine Scheduled Time based on mode
  let finalScheduledDate = new Date();
  if (mode === "optimal_time") {
    finalScheduledDate = calculateOptimalPostingTime();
  } else if (scheduledAt) {
    finalScheduledDate = new Date(scheduledAt);
  }

  // 5️⃣ Prepare Post Document
  let savedPost = null;
  if (targetPage) {
    savedPost = await FacebookPost.create({
      userId: targetPage.userId,
      pageRef: targetPage._id,
      content: postContent,
      linkUrl: productLink,
      imageUrl,
      scheduledAt: finalScheduledDate,
      status: mode === "draft" ? "pending" : "pending"
    });
  }

  // 6️⃣ Execute Publishing or Scheduling
  if (mode === "draft") {
    return {
      status: "draft",
      message: "Post generated and saved as draft for admin review.",
      post: savedPost,
      content: postContent,
      imageUrl,
      linkUrl: productLink,
      campaign: campaignData,
      optionsApplied: { tone, campaignType, targetAudience, promoCode, discountPercent, language, postLength, mode }
    };
  }

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
      facebookConfigured: false,
      optionsApplied: { tone, campaignType, targetAudience, promoCode, discountPercent, language, postLength, mode }
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
        facebookConfigured: true,
        optionsApplied: { tone, campaignType, targetAudience, promoCode, discountPercent, language, postLength, mode }
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
    // Schedule or Optimal Time mode: queue delayed job in BullMQ
    if (savedPost) {
      await enqueueFacebookPost(savedPost);
    }

    console.log(`⏰ Automated Facebook post scheduled for ${finalScheduledDate.toISOString()} [mode: ${mode}]`);

    return {
      status: "scheduled",
      message: mode === "optimal_time"
        ? `Automated post queued for peak engagement at ${finalScheduledDate.toLocaleString()}`
        : `Automated post queued in BullMQ scheduler for ${finalScheduledDate.toLocaleString()}`,
      post: savedPost,
      scheduledAt: finalScheduledDate,
      content: postContent,
      imageUrl,
      linkUrl: productLink,
      campaign: campaignData,
      facebookConfigured: true,
      optionsApplied: { tone, campaignType, targetAudience, promoCode, discountPercent, language, postLength, mode }
    };
  }
}

/**
 * Retrieves diagnostics and telemetry for the automated Facebook posting engine.
 */
export async function getAutoPostDiagnostics() {
  const [totalPublished, totalScheduled, totalFailed, totalPages] = await Promise.all([
    FacebookPost.countDocuments({ status: "published" }),
    FacebookPost.countDocuments({ status: "pending" }),
    FacebookPost.countDocuments({ status: "failed" }),
    FacebookPage.countDocuments()
  ]);

  const nextPeakWindow = calculateOptimalPostingTime();

  return {
    engine: "LangChain Autonomous Marketing Agent",
    status: "healthy",
    totalPublished,
    totalScheduled,
    totalFailed,
    connectedPages: totalPages,
    optimalPostingWindow: nextPeakWindow.toISOString(),
    automationAgentUrl: process.env.AUTOMATION_AGENT_URL || "http://localhost:8004"
  };
}

/**
 * Retries a previously failed Facebook post.
 */
export async function retryFailedFacebookPost(postId) {
  const post = await FacebookPost.findById(postId).populate("pageRef");
  if (!post) {
    throw new Error(`Post with ID ${postId} not found`);
  }

  const page = post.pageRef || await FacebookPage.findOne().sort({ updatedAt: -1 });
  if (!page) {
    throw new Error("No connected Facebook page found to retry posting.");
  }

  const token = decryptToken(page.pageAccessToken);
  const graphResponse = await publishToPage({
    pageId: page.pageId,
    pageAccessToken: token,
    content: post.content,
    imageUrl: post.imageUrl || undefined,
    linkUrl: post.linkUrl || undefined
  });

  post.status = "published";
  post.publishedAt = new Date();
  post.graphPostId = graphResponse?.id || null;
  post.errorMessage = undefined;
  await post.save();

  return {
    status: "published",
    message: "Post retried and published successfully",
    graphPostId: graphResponse?.id,
    post
  };
}
