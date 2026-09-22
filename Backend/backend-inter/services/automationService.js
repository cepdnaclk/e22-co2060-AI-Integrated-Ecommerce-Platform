import axios from "axios";

const AUTOMATION_URL = process.env.AUTOMATION_AGENT_URL || "http://automation-agent:8004";
const TIMEOUT_MS = 25000;

/**
 * Check if the LangChain automation service is accessible and healthy.
 */
export async function checkAutomationHealth() {
  try {
    const res = await axios.get(`${AUTOMATION_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch (err) {
    return {
      status: "unavailable",
      message: err.message,
      service: "langchain-automation-agent"
    };
  }
}

/**
 * Fetch all supported options and presets for campaign generation.
 */
export async function getMarketingOptions() {
  try {
    const res = await axios.get(`${AUTOMATION_URL}/automation/marketing-options`, { timeout: 4000 });
    return res.data;
  } catch (err) {
    return {
      tones: ["hype", "professional", "discount_driven", "storytelling", "informative", "humorous"],
      campaign_types: ["product_spotlight", "flash_sale", "deal_of_the_day", "trend_roundup", "buying_guide"],
      target_audiences: ["tech enthusiasts & gamers", "university students", "remote workers"],
      languages: ["English", "Sinhala", "Tamil"],
      post_lengths: ["short", "medium", "long"],
      publish_modes: ["now", "schedule", "optimal_time", "draft"]
    };
  }
}

/**
 * Trigger the LangChain Autonomous Marketing Campaign Agent.
 * @param {Object|string} options - Campaign customization options or string trend override
 */
export async function generateMarketingCampaign(options = {}) {
  let payload = {};
  if (typeof options === "string") {
    payload = { trend_override: options };
  } else if (options && typeof options === "object") {
    payload = {
      trend_override: options.trendOverride || options.trend_override,
      custom_product_id: options.customProductId || options.custom_product_id,
      tone: options.tone || "hype",
      campaign_type: options.campaignType || options.campaign_type || "product_spotlight",
      target_audience: options.targetAudience || options.target_audience || "tech enthusiasts & gamers",
      promo_code: options.promoCode || options.promo_code,
      discount_percent: options.discountPercent || options.discount_percent,
      language: options.language || "English",
      post_length: options.postLength || options.post_length || "medium"
    };
  }

  const res = await axios.post(`${AUTOMATION_URL}/automation/marketing-campaign`, payload, {
    timeout: TIMEOUT_MS
  });
  return res.data;
}

/**
 * Send customer query to the LangChain Tool-Augmented Support Agent.
 */
export async function askSupportAgent(message, history = []) {
  const res = await axios.post(
    `${AUTOMATION_URL}/automation/chat`,
    { message, history },
    { timeout: TIMEOUT_MS }
  );
  return res.data;
}

/**
 * Trigger LangChain Inventory Restock Review.
 */
export async function runRestockReview() {
  const res = await axios.post(`${AUTOMATION_URL}/automation/restock-review`, {}, {
    timeout: TIMEOUT_MS
  });
  return res.data;
}

/**
 * Extract and analyze YouTube trending products using LangChain.
 * @param {string} categoryFilter - Optional category filter (e.g. "Laptops", "Smartphones", "Audio")
 */
export async function getYouTubeTrendingProducts(categoryFilter = null) {
  const url = categoryFilter
    ? `${AUTOMATION_URL}/automation/youtube-trending-products?category_filter=${encodeURIComponent(categoryFilter)}`
    : `${AUTOMATION_URL}/automation/youtube-trending-products`;
  const res = await axios.get(url, { timeout: TIMEOUT_MS });
  return res.data;
}

