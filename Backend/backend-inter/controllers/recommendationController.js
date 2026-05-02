import {
  getRecommendations as getRecommendationsFromService,
  getProductPath,
  rebuildGraph as rebuildGraphInService,
  graphStats as getGraphStats,
} from "../services/recommendationService.js";

export const getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const parsed = Number.parseInt(req.query.top_n, 10);
    const topN = Number.isNaN(parsed) ? 8 : Math.min(Math.max(parsed, 1), 20);
    const data = await getRecommendationsFromService(productId, topN);
    return res.json(data);
  } catch (error) {
    console.error("❌ getRecommendations error:", error.message);
    return res.status(500).json({ message: "Failed to fetch recommendations", recommendations: [] });
  }
};

export const getPath = async (req, res) => {
  try {
    const { productId, targetId } = req.params;
    const data = await getProductPath(productId, targetId);
    return res.json(data);
  } catch (error) {
    console.error("❌ getPath error:", error.message);
    return res.status(500).json({ message: "Failed to fetch shortest path", path: [] });
  }
};

export const rebuildGraph = async (_req, res) => {
  try {
    const data = await rebuildGraphInService();
    return res.json(data);
  } catch (error) {
    console.error("❌ rebuildGraph error:", error.message);
    return res.status(500).json({ message: "Graph rebuild failed" });
  }
};

export const stats = async (_req, res) => {
  try {
    const data = await getGraphStats();
    return res.json(data);
  } catch (error) {
    console.error("❌ stats error:", error.message);
    return res.status(500).json({ nodeCount: 0, edgeCount: 0, lastBuilt: null });
  }
};

