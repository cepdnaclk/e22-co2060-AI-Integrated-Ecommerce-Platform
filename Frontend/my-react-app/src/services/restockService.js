import API_BASE_URL from "../config/api";

const API = `${API_BASE_URL}/api/sellers/restock`;

/**
 * Get restock priorities for the logged-in seller's products.
 * Returns ranked list with scores, tiers, and metrics.
 */
export async function getRestockPriorities() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/priorities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to fetch restock priorities");
  return json;
}
