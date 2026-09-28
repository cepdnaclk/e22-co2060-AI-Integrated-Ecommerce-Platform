import express from "express";
import { getYouTubeTrendingProducts } from "../services/automationService.js";

const router = express.Router();

/**
 * GET /api/trending/products
 * Returns concrete electronic products trending on YouTube extracted by LangChain,
 * enriched with reasons, sentiment, and store catalog matching.
 */
router.get("/products", async (req, res) => {
  try {
    const { category } = req.query;
    const result = await getYouTubeTrendingProducts(category);
    res.json(result);
  } catch (error) {
    console.error("❌ LangChain trending products extraction failed:", error.message);
    res.status(500).json({
      error: "Failed to extract YouTube trending products via LangChain agent",
      details: error.message
    });
  }
});

/**
 * GET /api/trending
 * Returns standard trending signals, or enriched LangChain output if ?mode=enriched
 */
router.get("/", async (req, res) => {
  const { mode, category } = req.query;

  if (mode === "enriched" || mode === "ai") {
    try {
      const result = await getYouTubeTrendingProducts(category);
      return res.json(result);
    } catch (err) {
      console.warn("⚠️ LangChain trending fallback to raw signals:", err.message);
    }
  }

  try {
    const trendingUrl = process.env.YOUTUBE_TRENDING_URL || "http://localhost:8003";
    const response = await fetch(`${trendingUrl}/trending`);
    
    if (!response.ok) {
      throw new Error(`Trending service responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("⚠️ Graceful fallback: Trending service unavailable:", error.message);
    res.json([]);
  }
});

export default router;
