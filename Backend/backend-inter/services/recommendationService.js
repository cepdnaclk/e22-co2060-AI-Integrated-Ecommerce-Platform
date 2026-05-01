import axios from "axios";

const RECO_URL = process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:8001";

export const getRecommendations = async (productId, topN = 8) => {
  try {
    const { data } = await axios.get(`${RECO_URL}/recommend/${encodeURIComponent(productId)}`, {
      params: { top_n: topN },
      timeout: 5000,
    });
    return data;
  } catch (error) {
    console.error("❌ Recommendation service unavailable:", error.message);
    return {
      sourceProductId: productId,
      recommendations: [],
      totalFound: 0,
      graphStats: { nodeCount: 0, edgeCount: 0, lastBuilt: null },
      processingTimeMs: 0,
    };
  }
};

export const getProductPath = async (productId, targetId) => {
  const { data } = await axios.get(
    `${RECO_URL}/recommend/${encodeURIComponent(productId)}/path/${encodeURIComponent(targetId)}`,
    { timeout: 5000 }
  );
  return data;
};

export const rebuildGraph = async () => {
  const { data } = await axios.post(`${RECO_URL}/recommend/graph/rebuild`, {}, { timeout: 15000 });
  return data;
};

export const graphStats = async () => {
  const { data } = await axios.get(`${RECO_URL}/recommend/graph/stats`, { timeout: 5000 });
  return data;
};

