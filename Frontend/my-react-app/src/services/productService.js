// src/services/productService.js

const BASE_URL = "http://localhost:3000/api/products";

/**
 * 📦 GET PRODUCTS (Browse / Search / Filters / Pagination)
 *
 * Uses query params only
 *
 * Example:
 * fetchProducts({
 *   page: 1,
 *   limit: 8,
 *   search: "iphone",
 *   category: "Electronics",
 *   sort: "price_asc"
 * })
 */
export const fetchProducts = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}?${query}`);

    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Fetch products error:", error);
    throw error;
  }
};

/**
 * 📦 GET PRODUCT DETAILS + SELLER OFFERS
 *
 * Backend returns:
 * {
 *   product: {...},
 *   offers: [...]
 * }
 */
export const fetchProductDetails = async (productId) => {
  try {
    const response = await fetch(`${BASE_URL}/${productId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch product details");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Fetch product details error:", error);
    throw error;
  }
};
