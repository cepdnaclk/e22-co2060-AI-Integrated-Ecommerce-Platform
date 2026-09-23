import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
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
    // Return an empty array instead of 500 to keep the frontend running smoothly
    res.json([]);
  }
});

export default router;
