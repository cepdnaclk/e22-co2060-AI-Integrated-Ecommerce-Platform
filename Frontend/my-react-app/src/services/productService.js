// src/services/productService.js
const BASE_URL = "http://localhost:3000/api/products";

export const fetchProducts = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}?${query}`);

    // ❌ Backend error
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Server error");
    }

    const data = await response.json();

    // ❌ Unexpected data shape
    if (!data || !Array.isArray(data.products)) {
      throw new Error("Invalid API response format");
    }

    return data;
  } catch (error) {
    console.error("❌ fetchProducts failed:", error.message);

    // ✅ Always return safe fallback
    return {
      products: [],
      totalProducts: 0,
      error: error.message
    };
  }
};

export const fetchProductDetails = async (productId) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/products/${productId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch product details");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ fetchProductDetails error:", error);
    throw error;
  }
};