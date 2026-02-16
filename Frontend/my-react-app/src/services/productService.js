// src/services/productService.js

const BASE_URL = "http://localhost:3000/api/products";

/**
 * 📦 GET PRODUCTS (Browse / Filters / Pagination)
 * Uses query params
 * Example:
 * fetchProducts({ page: 1, limit: 8, category: "Electronics" })
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
    console.error("Fetch products error:", error);
    throw error;
  }
};

/**
 * 🔍 POST SEARCH PRODUCTS (TEXT SEARCH)
 * Uses request body
 * Example:
 * searchProducts({ search: "hp gaming laptop", category: "Electronics" })
 */
export const searchProducts = async (filters = {}) => {
  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(filters)
    });

    if (!response.ok) {
      throw new Error("Failed to search products");
    }

    return await response.json();
  } catch (error) {
    console.error("Search products error:", error);
    throw error;
  }
};
