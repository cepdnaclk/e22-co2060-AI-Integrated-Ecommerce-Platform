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
    console.error("Error fetching trending data:", error);
    res.status(500).json({ error: "Failed to fetch trending products" });
  }
});

export default router;
