import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/recommendations`;

export const fetchRecommendations = async (productId, topN = 8) => {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(productId)}?top_n=${topN}`);
  if (!response.ok) {
    throw new Error("Failed to fetch recommendations");
  }
  return response.json();
};

