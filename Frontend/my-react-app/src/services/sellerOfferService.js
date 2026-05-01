import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/seller-offers`;
const SEARCH_URL = `${API_BASE_URL}/api/search`;

// ──────────────────────────────────────
// 🔍 SEARCH SELLER OFFERS (BUYER SIDE – legacy)
// ──────────────────────────────────────
export const searchSellerOffers = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
    );
    const query = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${BASE_URL}/search?${query}`);
    if (!response.ok) throw new Error("Failed to fetch seller offers");
    const data = await response.json();
    if (!data || !Array.isArray(data.results))
      throw new Error("Invalid seller offer response format");
    return data;
  } catch (error) {
    console.error("❌ searchSellerOffers error:", error.message);
    return { results: [], totalResults: 0, error: error.message };
  }
};

// ──────────────────────────────────────
// 🧠 SMART SEARCH (unified – new)
// ──────────────────────────────────────
export const smartSearch = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    const response = await fetch(`${SEARCH_URL}?${query}`);
    if (!response.ok) throw new Error("Smart search failed");
    return await response.json();
  } catch (error) {
    console.error("❌ smartSearch error:", error.message);
    return { results: [], total: 0, page: 1, pages: 0 };
  }
};

// ──────────────────────────────────────
// 🤖 AI AUTOCOMPLETE
// ──────────────────────────────────────
export const getAutocomplete = async (q) => {
  try {
    if (!q || q.trim().length < 2) return [];
    const response = await fetch(`${SEARCH_URL}/autocomplete?q=${encodeURIComponent(q.trim())}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
};

// ──────────────────────────────────────
// 🧑‍💼 GET MY SELLER OFFERS (SELLER DASHBOARD)
// ──────────────────────────────────────
export const getMySellerOffers = async (token) => {
  try {
    const response = await fetch(`${BASE_URL}/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch seller offers");
    return await response.json();
  } catch (error) {
    console.error("❌ getMySellerOffers error:", error.message);
    return [];
  }
};

// ──────────────────────────────────────
// ➕ CREATE SELLER OFFER
// ──────────────────────────────────────
export const createSellerOffer = async (token, payload) => {
  const response = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create offer");
  return data;
};

// ──────────────────────────────────────
// ✏️ UPDATE SELLER OFFER
// ──────────────────────────────────────
export const updateSellerOffer = async (token, id, payload) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update offer");
  return data;
};

// ──────────────────────────────────────
// ⏸️ PAUSE SELLER OFFER (soft-disable)
// ──────────────────────────────────────
export const disableSellerOffer = async (token, id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to pause offer");
  return data;
};

// ──────────────────────────────────────
// ▶️ RESUME (RE-ENABLE) SELLER OFFER
// ──────────────────────────────────────
export const enableSellerOffer = async (token, id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ isActive: true })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to resume offer");
  return data;
};