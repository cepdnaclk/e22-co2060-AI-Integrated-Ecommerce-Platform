const BASE_URL = "http://localhost:3000/api/seller-offers";

/**
 * ======================================================
 * 🔍 SEARCH SELLER OFFERS (BUYER SIDE)
 * ======================================================
 * Used for:
 * - Search bar results
 * - Price comparison
 * - Offer grid
 *
 * Query params:
 * q        → search text
 * category → product category
 * sort     → price_asc | price_desc
 * page     → pagination
 * limit    → pagination
 */
export const searchSellerOffers = async (params = {}) => {
  try {
    // Clean undefined / null params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
    );

    const query = new URLSearchParams(cleanParams).toString();

    const response = await fetch(`${BASE_URL}/search?${query}`);

    if (!response.ok) {
      throw new Error("Failed to fetch seller offers");
    }

    const data = await response.json();

    // Validate response shape
    if (!data || !Array.isArray(data.results)) {
      throw new Error("Invalid seller offer response format");
    }

    return data;
  } catch (error) {
    console.error("❌ searchSellerOffers error:", error.message);

    // Safe fallback for UI
    return {
      results: [],
      totalResults: 0,
      error: error.message
    };
  }
};

/**
 * ======================================================
 * 🧑‍💼 GET MY SELLER OFFERS (SELLER DASHBOARD)
 * ======================================================
 * Requires Authorization header
 */
export const getMySellerOffers = async (token) => {
  try {
    const response = await fetch(`${BASE_URL}/my`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch seller offers");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ getMySellerOffers error:", error.message);
    return [];
  }
};