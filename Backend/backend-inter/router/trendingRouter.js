import express from "express";
import productModel from "../models/products.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const trendingUrl = process.env.YOUTUBE_TRENDING_URL || "http://localhost:8003";
    const response = await fetch(`${trendingUrl}/trending`);
    
    if (!response.ok) {
      throw new Error(`Trending service responded with status: ${response.status}`);
    }
    
    const data = await response.json();

    // Enrich each trending item with the real product image from MongoDB
    const enriched = await Promise.all(
      data.map(async (item) => {
        try {
          const product = await productModel.findOne(
            { productName: { $regex: new RegExp(item.Keyword, "i") } },
            { image: 1 }
          );
          return {
            ...item,
            image: product?.image || null,
          };
        } catch {
          return { ...item, image: null };
        }
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("⚠️ Graceful fallback: Trending service unavailable:", error.message);
    res.json([]);
  }
});

export default router;
