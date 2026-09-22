import express from "express";
import {
  checkAutomationHealth,
  generateMarketingCampaign,
  runRestockReview
} from "../services/automationService.js";

const router = express.Router();

/**
 * GET /api/automation/status
 * Check LangChain automation service status
 */
router.get("/status", async (req, res) => {
  const health = await checkAutomationHealth();
  res.json(health);
});

/**
 * POST /api/automation/campaign/generate
 * Run LangChain Trend-to-Marketing Agent
 */
router.post("/campaign/generate", async (req, res) => {
  try {
    const { trendOverride } = req.body;
    const result = await generateMarketingCampaign(trendOverride);
    res.json(result);
  } catch (error) {
    console.error("❌ Marketing campaign automation failed:", error.message);
    res.status(500).json({
      error: "Failed to generate marketing campaign via LangChain agent",
      details: error.message
    });
  }
});

/**
 * POST /api/automation/campaign/publish
 * Auto-publish or schedule a generated campaign to Facebook
 */
router.post("/campaign/publish", async (req, res) => {
  try {
    const { campaign, scheduledTime, pageId } = req.body;

    if (!campaign || !campaign.post_caption) {
      return res.status(400).json({ error: "Valid campaign object with post_caption is required." });
    }

    const postContent = `${campaign.headline}\n\n${campaign.post_caption}\n\n${(campaign.hashtags || []).join(" ")}\n\n${campaign.call_to_action}`;

    // If Facebook module is enabled and helper is present
    if ((process.env.ENABLE_FACEBOOK_MODULE || "false").toLowerCase() === "true") {
      try {
        const { publishToPage } = await import("../services/facebookService.js");
        if (pageId && process.env.FB_PAGE_ACCESS_TOKEN) {
          const published = await publishToPage({
            pageId,
            pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN,
            content: postContent,
          });
          return res.json({
            status: "published",
            platform: "Facebook",
            facebookResponse: published,
            content: postContent
          });
        }
      } catch (fbErr) {
        console.warn("⚠️ Facebook direct publish warning:", fbErr.message);
      }
    }

    // Default response (saved/prepared for scheduling)
    res.json({
      status: "scheduled",
      message: "Campaign prepared for social publishing",
      scheduledTime: scheduledTime || new Date(Date.now() + 3600000).toISOString(),
      content: postContent,
      matchedProduct: campaign.matched_product_name
    });
  } catch (error) {
    console.error("❌ Publish automation failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automation/facebook/auto-post
 * Autonomous End-to-End Facebook Post Generation & Publishing Pipeline
 */
router.post("/facebook/auto-post", async (req, res) => {
  try {
    const { executeAutomatedFacebookPost } = await import("../services/facebookAutoPosterService.js");
    const { pageId, trendOverride, mode, scheduledAt } = req.body || {};

    const result = await executeAutomatedFacebookPost({
      pageId,
      trendOverride,
      mode: mode || "now",
      scheduledAt
    });

    res.json(result);
  } catch (error) {
    console.error("❌ End-to-end auto Facebook post failed:", error.message);
    res.status(500).json({
      error: "Failed to execute automated Facebook post",
      details: error.message
    });
  }
});

/**
 * POST /api/automation/restock/review
 * Run LangChain Inventory & Restock Automation Agent
 */
router.post("/restock/review", async (req, res) => {
  try {
    const review = await runRestockReview();
    res.json(review);
  } catch (error) {
    console.error("❌ Restock review automation failed:", error.message);
    res.status(500).json({
      error: "Failed to run inventory restock review",
      details: error.message
    });
  }
});

export default router;
